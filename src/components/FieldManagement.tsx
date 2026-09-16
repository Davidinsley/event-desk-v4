// Revision: Field Management 7/7/5 action layout + Menu Overview; retains event-number draw persistence and Clash integrations.
import { useState } from "react";
import "./NewEvent.css";

import type { Player } from "../types/Player";
import type { Event } from "../types/Event";
import type { DrawPreviewData } from "./DrawPreview";

import PageLayout from "../layout/PageLayout";
import SummaryCard from "../ui/SummaryCard";
import ActionTile from "../ui/ActionTile";

import {
  Shuffle,
  ListOrdered,
  Users,
  Trophy,
  Scale,
  Swords,
  RotateCcw,
  CheckCircle,
  Printer,
  BookOpen,
  Construction,
} from "lucide-react";

interface FieldManagementProps {
  event: Event;
  players: Player[];
  setPlayers: (players: Player[]) => void;
  onExportPrint: (data: DrawPreviewData) => void;
}

type DrawMethod =
  | "random"
  | "handicap"
  | "gross"
  | "nett"
  | "balanced"
  | "singles"
  | "pairDraw"
  | "doublePairs"
  | "clashPairs"
  | "mixedClashPairs"
  | "pairs";

interface DrawnPlayer extends Player {
  groupNumber: number;
  positionInGroup: number;
}

interface KnockoutSlot {
  seed?: number;
  playerId?: string;
  playerName?: string;
}

interface KnockoutMatch {
  matchNumber: number;
  round: number;
  slotA: KnockoutSlot;
  slotB: KnockoutSlot;
}

interface KnockoutBracket {
  entrants: number;
  bracketSize: number;
  rounds: number;
  matches: KnockoutMatch[];
}

interface PairEntrant {
  id: string;
  playerA: Player;
  playerB: Player;
  combinedHI: number;
  seed?: number;
  defending: boolean;
}

interface DoubleDrawPair {
  id: string;
  pairNumber: number;
  playerA: Player;
  playerB: Player;
}

interface DoubleDrawMatch {
  matchNumber: number;
  pairA: DoubleDrawPair;
  pairB: DoubleDrawPair | null;
}

interface ClashTeamPlayer {
  id: string;
  firstName: string;
  lastName: string;
  handicapIndex: number;
}

interface ClashDrawPlayer extends ClashTeamPlayer {
  isCaptain?: boolean;
  isReserve?: boolean;
}

interface ClashPair {
  id: string;
  pairNumber: number;
  team: "red" | "blue";
  playerA: ClashDrawPlayer;
  playerB: ClashDrawPlayer;
  containsCaptain: boolean;
}

interface ClashMatch {
  matchNumber: number;
  redPair: ClashPair;
  bluePair: ClashPair;
}

interface MixedClashPair {
  id: string;
  pairNumber: number;
  team: "red" | "blue";
  man: ClashTeamPlayer;
  lady: ClashTeamPlayer;
  containsCaptains: boolean;
}

interface MixedClashMatch {
  matchNumber: number;
  redPair: MixedClashPair;
  bluePair: MixedClashPair;
}

interface GrossScoreEntry {
  playerId: string;
  gross: string;
}

interface NettScoreEntry {
  playerId: string;
  gross: string;
  playingHandicap: string;
}

interface ExistingStartListRow {
  id: string;
  teeTime: string;
  group: string;
  playerId: string;
  playerName: string;
  homeClub: string;
  handicapIndex: number | null;
}

interface PersistedState {
  playerSignature: string;
  selectedMethod: DrawMethod | null;
  proposedDraw: DrawnPlayer[];
  confirmedDraw: DrawnPlayer[];
  roundOneConfirmed: boolean;
  drawConfirmed: boolean;
  grossStage: "round1" | "scores" | "round2";
  grossScores: GrossScoreEntry[];
  nettStage: "round1" | "scores" | "round2";
  nettScores: NettScoreEntry[];
  knockoutBracket?: KnockoutBracket | null;
  defendingPairIds?: [string, string] | null;
  doublePairsStage?: "pairs" | "matches";
  doubleDrawPairs?: DoubleDrawPair[];
  doubleDrawMatches?: DoubleDrawMatch[];
  clashRedTeam?: ClashTeamPlayer[];
  clashBlueTeam?: ClashTeamPlayer[];
  clashStage?: "lineups" | "pairs" | "matches";
  clashRedPairs?: ClashPair[];
  clashBluePairs?: ClashPair[];
  clashMatches?: ClashMatch[];
  mixedClashRedMen?: ClashTeamPlayer[];
  mixedClashRedLadies?: ClashTeamPlayer[];
  mixedClashBlueMen?: ClashTeamPlayer[];
  mixedClashBlueLadies?: ClashTeamPlayer[];
  mixedClashStage?: "lineups" | "pairs" | "matches";
  mixedClashRedPairs?: MixedClashPair[];
  mixedClashBluePairs?: MixedClashPair[];
  mixedClashMatches?: MixedClashMatch[];
}

function createMixedClashPairs(
  men: ClashTeamPlayer[],
  ladies: ClashTeamPlayer[],
  team: "red" | "blue"
): MixedClashPair[] {
  if (men.length === 0 || ladies.length === 0) return [];

  if (men.length !== ladies.length) {
    throw new Error(
      `${team === "red" ? "Red" : "Blue"} Men and Ladies lists must contain the same number of players before the mixed pairs can be drawn.`
    );
  }

  const captainMan = men[0];
  const captainLady = ladies[0];

  const shuffle = <T,>(items: T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const shuffledMen = shuffle(men.slice(1));
  const shuffledLadies = shuffle(ladies.slice(1));

  const pairs: MixedClashPair[] = [
    {
      id: `${team}-mixed-pair-1`,
      pairNumber: 1,
      team,
      man: captainMan,
      lady: captainLady,
      containsCaptains: true,
    },
  ];

  for (let index = 0; index < shuffledMen.length; index += 1) {
    pairs.push({
      id: `${team}-mixed-pair-${index + 2}`,
      pairNumber: index + 2,
      team,
      man: shuffledMen[index],
      lady: shuffledLadies[index],
      containsCaptains: false,
    });
  }

  return pairs;
}

function createMixedClashMatches(
  redPairs: MixedClashPair[],
  bluePairs: MixedClashPair[]
): MixedClashMatch[] {
  if (redPairs.length === 0 || bluePairs.length === 0) return [];
  if (redPairs.length !== bluePairs.length) {
    throw new Error("Red and Blue must contain the same number of mixed pairs.");
  }

  const redCaptainPair = redPairs.find((pair) => pair.containsCaptains);
  const blueCaptainPair = bluePairs.find((pair) => pair.containsCaptains);

  if (!redCaptainPair || !blueCaptainPair) {
    throw new Error("Both teams must contain a Captains Pair before the match draw.");
  }

  const shuffle = <T,>(items: T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const redRemaining = shuffle(redPairs.filter((pair) => !pair.containsCaptains));
  const blueRemaining = shuffle(bluePairs.filter((pair) => !pair.containsCaptains));

  const matches: MixedClashMatch[] = [
    {
      matchNumber: 1,
      redPair: redCaptainPair,
      bluePair: blueCaptainPair,
    },
  ];

  redRemaining.forEach((redPair, index) => {
    matches.push({
      matchNumber: index + 2,
      redPair,
      bluePair: blueRemaining[index],
    });
  });

  return matches;
}

const STORAGE_KEY_PREFIX = "event-desk-field-management-draw-v4";

const drawMethods: {
  key: DrawMethod;
  title: string;
  icon: typeof Shuffle;
}[] = [
  { key: "random", title: "Random Draw", icon: Shuffle },
  { key: "handicap", title: "HI Draw", icon: ListOrdered },
  { key: "gross", title: "Championship Gross", icon: Trophy },
  { key: "nett", title: "Championship Nett", icon: Trophy },
  { key: "balanced", title: "Balanced", icon: Scale },
  { key: "singles", title: "Singles Knockout", icon: Swords },
  { key: "pairDraw", title: "Pairs Draw", icon: Users },
  { key: "doublePairs", title: "Double Draw Pairs", icon: Shuffle },
  { key: "clashPairs", title: "Clash Pairs", icon: Swords },
  { key: "mixedClashPairs", title: "Mixed Clash Pairs", icon: Users },
  { key: "pairs", title: "Pairs Knockout", icon: Users },
];

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normaliseCsvHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseClashHandicap(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const plusHandicap = trimmed.startsWith("+");
  const numeric = Number(trimmed.replace(/^\+/, ""));

  if (!Number.isFinite(numeric)) return null;
  return plusHandicap ? -Math.abs(numeric) : numeric;
}

function parseClashTeamCsv(
  text: string,
  team: "red" | "blue"
): ClashTeamPlayer[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    throw new Error("The CSV must contain a heading row and at least one player.");
  }

  const headers = parseCsvLine(lines[0]).map(normaliseCsvHeader);
  const firstNameIndex = headers.findIndex((header) =>
    ["firstname", "first", "forename"].includes(header)
  );
  const lastNameIndex = headers.findIndex((header) =>
    ["lastname", "surname", "last"].includes(header)
  );
  const fullNameIndex = headers.findIndex((header) =>
    ["player", "playername", "name", "fullname"].includes(header)
  );
  const hiIndex = headers.findIndex((header) =>
    ["hi", "handicapindex", "handicap", "index"].includes(header)
  );

  const hasSplitName = firstNameIndex >= 0 && lastNameIndex >= 0;
  if ((!hasSplitName && fullNameIndex < 0) || hiIndex < 0) {
    throw new Error(
      'Use either "First Name, Last Name, HI" or "Player Name, HI" headings.'
    );
  }

  const parsed: ClashTeamPlayer[] = [];

  lines.slice(1).forEach((line, rowIndex) => {
    const cells = parseCsvLine(line);
    let firstName = "";
    let lastName = "";

    if (hasSplitName) {
      firstName = cells[firstNameIndex]?.trim() ?? "";
      lastName = cells[lastNameIndex]?.trim() ?? "";
    } else {
      const fullName = cells[fullNameIndex]?.trim() ?? "";
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      firstName = nameParts.shift() ?? "";
      lastName = nameParts.join(" ");
    }

    const handicapIndex = parseClashHandicap(cells[hiIndex] ?? "");

    if (!firstName || handicapIndex === null) {
      throw new Error(
        `Row ${rowIndex + 2} is missing a player name or valid Handicap Index.`
      );
    }

    parsed.push({
      id: `clash-${team}-${Date.now()}-${rowIndex}-${firstName}-${lastName}`,
      firstName,
      lastName,
      handicapIndex,
    });
  });

  if (parsed.length > 20) {
    throw new Error("A Clash team can contain a maximum of 20 imported players.");
  }

  return parsed;
}

function shuffleClashPlayers(source: ClashDrawPlayer[]): ClashDrawPlayer[] {
  const result = [...source];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildClashTeamSlots(
  team: ClashTeamPlayer[],
  side: "red" | "blue",
  targetSize: number
): ClashDrawPlayer[] {
  const realPlayers: ClashDrawPlayer[] = team.map((player, index) => ({
    ...player,
    isCaptain: index === 0,
    isReserve: false,
  }));

  const slots = [...realPlayers];
  let reserveNumber = 1;
  while (slots.length < targetSize) {
    slots.push({
      id: `clash-${side}-reserve-${reserveNumber}`,
      firstName: "Reserve",
      lastName: String(reserveNumber),
      handicapIndex: 0,
      isCaptain: false,
      isReserve: true,
    });
    reserveNumber += 1;
  }
  return slots;
}

function createClashPairs(
  team: ClashTeamPlayer[],
  side: "red" | "blue",
  targetSize: number
): ClashPair[] {
  const slots = buildClashTeamSlots(team, side, targetSize);
  const captain = slots.find((player) => player.isCaptain);
  const others = slots.filter((player) => !player.isCaptain);
  const realOthers = shuffleClashPlayers(others.filter((player) => !player.isReserve));
  const reserves = others.filter((player) => player.isReserve);
  const pairs: ClashPair[] = [];

  const addPair = (playerA: ClashDrawPlayer, playerB: ClashDrawPlayer) => {
    const pairNumber = pairs.length + 1;
    pairs.push({
      id: `clash-${side}-pair-${pairNumber}-${playerA.id}-${playerB.id}`,
      pairNumber,
      team: side,
      playerA,
      playerB,
      containsCaptain: Boolean(playerA.isCaptain || playerB.isCaptain),
    });
  };

  // Pair 1 always contains the Captain and, where available, a real player.
  if (captain) {
    const captainPartner = realOthers.shift() ?? reserves.shift();
    if (captainPartner) addPair(captain, captainPartner);
  }

  // Reserve positions are only used after the Captain-picked team-size
  // validation has confirmed that the two imported teams are equal or
  // differ by one player. Keep Reserve positions with real players.
  reserves.forEach((reserve) => {
    const realPartner = realOthers.shift();
    if (realPartner) addPair(realPartner, reserve);
  });

  // Randomly pair all remaining real players.
  const remainingRealPlayers = shuffleClashPlayers(realOthers);
  for (let index = 0; index < remainingRealPlayers.length; index += 2) {
    const playerA = remainingRealPlayers[index];
    const playerB = remainingRealPlayers[index + 1];
    if (playerA && playerB) addPair(playerA, playerB);
  }

  // Captain pair is always first. If a Reserve is required, the
  // Reserve-affected pair is always last. Everything between remains random.
  const captainPair = pairs.find((pair) => pair.containsCaptain);
  const reservePair = pairs.find(
    (pair) =>
      !pair.containsCaptain &&
      Boolean(pair.playerA.isReserve || pair.playerB.isReserve)
  );
  const middlePairs = pairs.filter(
    (pair) => pair !== captainPair && pair !== reservePair
  );

  for (let i = middlePairs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [middlePairs[i], middlePairs[j]] = [middlePairs[j], middlePairs[i]];
  }

  const orderedPairs: ClashPair[] = [];
  if (captainPair) orderedPairs.push(captainPair);
  orderedPairs.push(...middlePairs);
  if (reservePair) orderedPairs.push(reservePair);

  return orderedPairs.map((pair, index) => ({
    ...pair,
    pairNumber: index + 1,
  }));
}

function createClashMatches(redPairs: ClashPair[], bluePairs: ClashPair[]): ClashMatch[] {
  const redCaptainPair = redPairs.find((pair) => pair.containsCaptain);
  const blueCaptainPair = bluePairs.find((pair) => pair.containsCaptain);

  const containsReserve = (pair: ClashPair) =>
    Boolean(pair.playerA.isReserve || pair.playerB.isReserve);

  const redReservePair = redPairs.find(
    (pair) => pair !== redCaptainPair && containsReserve(pair)
  );
  const blueReservePair = bluePairs.find(
    (pair) => pair !== blueCaptainPair && containsReserve(pair)
  );

  const shufflePairs = (source: ClashPair[]): ClashPair[] => {
    const result = [...source];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  const redMiddle = shufflePairs(
    redPairs.filter(
      (pair) => pair !== redCaptainPair && pair !== redReservePair
    )
  );
  const blueMiddle = shufflePairs(
    bluePairs.filter(
      (pair) => pair !== blueCaptainPair && pair !== blueReservePair
    )
  );

  const matches: ClashMatch[] = [];

  // Match 1 is always Captain pair v Captain pair.
  if (redCaptainPair && blueCaptainPair) {
    matches.push({
      matchNumber: 1,
      redPair: redCaptainPair,
      bluePair: blueCaptainPair,
    });
  }

  // When only one team has a Reserve pair, hold back one random complete
  // pair from the other team so the Reserve-affected match is always last.
  let lastRedPair = redReservePair;
  let lastBluePair = blueReservePair;

  if (redReservePair && !blueReservePair) {
    lastBluePair = blueMiddle.pop();
  } else if (blueReservePair && !redReservePair) {
    lastRedPair = redMiddle.pop();
  }

  const middleCount = Math.min(redMiddle.length, blueMiddle.length);
  for (let index = 0; index < middleCount; index += 1) {
    matches.push({
      matchNumber: matches.length + 1,
      redPair: redMiddle[index],
      bluePair: blueMiddle[index],
    });
  }

  // Any Reserve-affected match is always the final match / tee group.
  if (lastRedPair && lastBluePair) {
    matches.push({
      matchNumber: matches.length + 1,
      redPair: lastRedPair,
      bluePair: lastBluePair,
    });
  }

  return matches;
}

function shufflePlayers(source: Player[]): Player[] {
  const result = [...source];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [
      result[j],
      result[i],
    ];
  }

  return result;
}

/*
 * For normal field draws:
 * - 4-balls are preferred.
 * - If a remainder can be resolved with multiple 3-balls,
 *   use 3-balls rather than a 2-ball.
 * - A 2-ball is a last resort.
 * - Never create a single-player group.
 *
 * Random Draw: smaller groups go first.
 * HI/Gross: caller may reverse the group-size order where appropriate.
 */
function getGroupSizes(
  count: number,
  smallerGroupsFirst = true
): number[] {
  if (count < 2) {
    return [];
  }

  const fours = Math.floor(count / 4);
  const remainder = count % 4;

  let sizes: number[];

  if (remainder === 0) {
    sizes = Array.from(
      { length: fours },
      () => 4
    );
  } else if (remainder === 1) {
    if (fours >= 2) {
      sizes = [
        3,
        3,
        3,
        ...Array.from(
          { length: fours - 2 },
          () => 4
        ),
      ];
    } else {
      sizes = [3, 2];
    }
  } else if (remainder === 2) {
    if (fours >= 1) {
      sizes = [
        3,
        3,
        ...Array.from(
          { length: fours - 1 },
          () => 4
        ),
      ];
    } else {
      sizes = [2];
    }
  } else {
    sizes = [
      3,
      ...Array.from(
        { length: fours },
        () => 4
      ),
    ];
  }

  return smallerGroupsFirst
    ? sizes
    : [...sizes].sort((a, b) => b - a);
}

function createRandomDraw(
  players: Player[]
): DrawnPlayer[] {
  const shuffled = shufflePlayers(players);
  const sizes = getGroupSizes(
    shuffled.length,
    true
  );

  const result: DrawnPlayer[] = [];
  let index = 0;

  sizes.forEach((size, groupIndex) => {
    for (
      let position = 0;
      position < size;
      position += 1
    ) {
      const player = shuffled[index];

      if (!player) {
        continue;
      }

      result.push({
        ...player,
        groupNumber: groupIndex + 1,
        positionInGroup: position + 1,
      });

      index += 1;
    }
  });

  return result;
}

function createBalancedDraw(
  players: Player[]
): DrawnPlayer[] {
  const groupSizes = getGroupSizes(
    players.length,
    true
  );

  if (groupSizes.length === 0) {
    return [];
  }

  /*
   * The target is the average aggregate HI per group.
   * Players are assigned from low to high HI in a
   * snake pattern so every group receives a mix of
   * abilities, then beneficial swaps are used to
   * reduce aggregate differences.
   */
  const ordered = [...players].sort(
    (a, b) =>
      a.handicapIndex - b.handicapIndex
  );

  const target =
    ordered.reduce(
      (sum, player) =>
        sum + player.handicapIndex,
      0
    ) / groupSizes.length;

  const groups: Player[][] =
    Array.from(
      { length: groupSizes.length },
      () => []
    );

  let index = 0;

  while (index < ordered.length) {
    const forward =
      Math.floor(
        index / groupSizes.length
      ) % 2 === 0;

    const order = forward
      ? Array.from(
          { length: groupSizes.length },
          (_, i) => i
        )
      : Array.from(
          { length: groupSizes.length },
          (_, i) =>
            groupSizes.length - 1 - i
        );

    for (const groupIndex of order) {
      if (index >= ordered.length) {
        break;
      }

      if (
        groups[groupIndex].length <
        groupSizes[groupIndex]
      ) {
        groups[groupIndex].push(
          ordered[index]
        );
        index += 1;
      }
    }
  }

  const aggregate = () =>
    groups.map((group) =>
      group.reduce(
        (sum, player) =>
          sum + player.handicapIndex,
        0
      )
    );

  const score = () =>
    aggregate().reduce(
      (total, value) =>
        total + Math.abs(value - target),
      0
    );

  // Improve aggregate equality without
  // changing group capacities.
  for (;;) {
    const currentScore = score();
    let best:
      | {
          score: number;
          groupA: number;
          groupB: number;
          indexA: number;
          indexB: number;
        }
      | null = null;

    for (
      let groupA = 0;
      groupA < groups.length;
      groupA += 1
    ) {
      for (
        let groupB = groupA + 1;
        groupB < groups.length;
        groupB += 1
      ) {
        for (
          let indexA = 0;
          indexA < groups[groupA].length;
          indexA += 1
        ) {
          for (
            let indexB = 0;
            indexB < groups[groupB].length;
            indexB += 1
          ) {
            const playerA =
              groups[groupA][indexA];
            const playerB =
              groups[groupB][indexB];

            if (!playerA || !playerB) {
              continue;
            }

            const aggregateNow =
              aggregate();

            const nextA =
              aggregateNow[groupA] -
              playerA.handicapIndex +
              playerB.handicapIndex;

            const nextB =
              aggregateNow[groupB] -
              playerB.handicapIndex +
              playerA.handicapIndex;

            const nextScore =
              currentScore -
              Math.abs(
                aggregateNow[groupA] -
                  target
              ) -
              Math.abs(
                aggregateNow[groupB] -
                  target
              ) +
              Math.abs(nextA - target) +
              Math.abs(nextB - target);

            if (
              nextScore <
              currentScore - 0.0001
            ) {
              if (
                !best ||
                nextScore <
                  best.score
              ) {
                best = {
                  score: nextScore,
                  groupA,
                  groupB,
                  indexA,
                  indexB,
                };
              }
            }
          }
        }
      }
    }

    if (!best) {
      break;
    }

    [
      groups[best.groupA][
        best.indexA
      ],
      groups[best.groupB][
        best.indexB
      ],
    ] = [
      groups[best.groupB][
        best.indexB
      ],
      groups[best.groupA][
        best.indexA
      ],
    ];
  }

  const result: DrawnPlayer[] = [];

  groups.forEach(
    (group, groupIndex) => {
      group.forEach(
        (player, position) => {
          result.push({
            ...player,
            groupNumber:
              groupIndex + 1,
            positionInGroup:
              position + 1,
          });
        }
      );
    }
  );

  return result;
}

function createHandicapDraw(
  players: Player[]
): DrawnPlayer[] {
  const ordered = [...players].sort(
    (a, b) =>
      a.handicapIndex - b.handicapIndex
  );

  const sizes = getGroupSizes(
    ordered.length,
    false
  );

  const result: DrawnPlayer[] = [];
  let index = 0;

  sizes.forEach((size, groupIndex) => {
    for (
      let position = 0;
      position < size;
      position += 1
    ) {
      const player = ordered[index];

      if (!player) {
        continue;
      }

      result.push({
        ...player,
        groupNumber: groupIndex + 1,
        positionInGroup: position + 1,
      });

      index += 1;
    }
  });

  return result;
}

function createRoundTwoNettDraw(
  players: Player[],
  nettScores: NettScoreEntry[]
): DrawnPlayer[] {
  const scoreMap = new Map(
    nettScores.map((entry) => [
      entry.playerId,
      Number(entry.gross) -
        Number(entry.playingHandicap),
    ])
  );

  const ordered = [...players].sort(
    (a, b) => {
      const nettA =
        scoreMap.get(a.id) ??
        Number.POSITIVE_INFINITY;

      const nettB =
        scoreMap.get(b.id) ??
        Number.POSITIVE_INFINITY;

      if (nettA !== nettB) {
        // Better/lowest nett score starts later.
        return nettB - nettA;
      }

      // Agreed tie-break: lowest HI takes the later slot.
      return (
        b.handicapIndex -
        a.handicapIndex
      );
    }
  );

  const sizes = getGroupSizes(
    ordered.length,
    false
  );

  const result: DrawnPlayer[] = [];
  let index = 0;

  sizes.forEach((size, groupIndex) => {
    for (
      let position = 0;
      position < size;
      position += 1
    ) {
      const player = ordered[index];

      if (!player) continue;

      result.push({
        ...player,
        groupNumber: groupIndex + 1,
        positionInGroup: position + 1,
      });

      index += 1;
    }
  });

  return result;
}

function createRoundTwoGrossDraw(
  players: Player[],
  grossScores: GrossScoreEntry[]
): DrawnPlayer[] {
  const scoreMap = new Map(
    grossScores.map((entry) => [
      entry.playerId,
      Number(entry.gross),
    ])
  );

  /*
   * Lower/better gross score belongs at the back
   * of the field.
   *
   * Where gross scores tie, lower HI takes the
   * later position.
   */
  const ordered = [...players].sort(
    (a, b) => {
      const grossA =
        scoreMap.get(a.id) ??
        Number.POSITIVE_INFINITY;

      const grossB =
        scoreMap.get(b.id) ??
        Number.POSITIVE_INFINITY;

      if (grossA !== grossB) {
        return grossB - grossA;
      }

      return (
        b.handicapIndex -
        a.handicapIndex
      );
    }
  );

  /*
   * For Round 2, larger groups are placed at the
   * front and the smaller group, when required, is
   * placed at the back so the field finishes cleanly.
   */
  const sizes = getGroupSizes(
    ordered.length,
    false
  );

  const result: DrawnPlayer[] = [];
  let index = 0;

  sizes.forEach((size, groupIndex) => {
    for (
      let position = 0;
      position < size;
      position += 1
    ) {
      const player = ordered[index];

      if (!player) {
        continue;
      }

      result.push({
        ...player,
        groupNumber: groupIndex + 1,
        positionInGroup: position + 1,
      });

      index += 1;
    }
  });

  return result;
}

function createPairsDraw(
  players: Player[]
): DrawnPlayer[] {
  const shuffled = shufflePlayers(players);
  const result: DrawnPlayer[] = [];

  shuffled.forEach((player, index) => {
    result.push({
      ...player,
      groupNumber: Math.floor(index / 2) + 1,
      positionInGroup: (index % 2) + 1,
    });
  });

  if (shuffled.length % 2 === 1) {
    const pairNumber = Math.floor(shuffled.length / 2) + 1;

    result.push({
      id: `pending-ghost-${pairNumber}`,
      firstName: "Pending",
      lastName: "Ghost",
      handicapIndex: 0,
      status: "Registered",
      source: "Manual",
      paid: false,
      notes: "Vacant pairs-draw position",
      groupNumber: pairNumber,
      positionInGroup: 2,
    } as DrawnPlayer);
  }

  return result;
}

function createDoubleDrawPairs(players: Player[]): DoubleDrawPair[] {
  const drawn = createPairsDraw(players);
  const pairs: DoubleDrawPair[] = [];

  for (let index = 0; index < drawn.length; index += 2) {
    const playerA = drawn[index];
    const playerB = drawn[index + 1];

    if (!playerA || !playerB) continue;

    const pairNumber = Math.floor(index / 2) + 1;
    pairs.push({
      id: `double-pair-${pairNumber}-${playerA.id}-${playerB.id}`,
      pairNumber,
      playerA,
      playerB,
    });
  }

  return pairs;
}

function createDoubleDrawMatches(
  pairs: DoubleDrawPair[]
): DoubleDrawMatch[] {
  const shuffled = [...pairs];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const matches: DoubleDrawMatch[] = [];

  for (let index = 0; index < shuffled.length; index += 2) {
    const pairA = shuffled[index];
    if (!pairA) continue;

    matches.push({
      matchNumber: Math.floor(index / 2) + 1,
      pairA,
      pairB: shuffled[index + 1] ?? null,
    });
  }

  return matches;
}

function createRandomPairing(
  players: Player[],
  defendingPairIds: [string, string] | null
): PairEntrant[] {
  const working = [...players];
  const pairs: PairEntrant[] = [];

  if (defendingPairIds) {
    const [firstId, secondId] = defendingPairIds;

    const firstIndex = working.findIndex(
      (player) => player.id === firstId
    );

    const first =
      firstIndex >= 0
        ? working.splice(firstIndex, 1)[0]
        : undefined;

    const secondIndex = working.findIndex(
      (player) => player.id === secondId
    );

    const second =
      secondIndex >= 0
        ? working.splice(secondIndex, 1)[0]
        : undefined;

    if (first && second) {
      pairs.push({
        id: `pair-${first.id}-${second.id}`,
        playerA: first,
        playerB: second,
        combinedHI:
          first.handicapIndex +
          second.handicapIndex,
        seed: 1,
        defending: true,
      });
    }
  }

  const shuffled = shufflePlayers(working);

  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    const playerA = shuffled[i];
    const playerB = shuffled[i + 1];

    if (!playerA || !playerB) continue;

    pairs.push({
      id: `pair-${playerA.id}-${playerB.id}`,
      playerA,
      playerB,
      combinedHI:
        playerA.handicapIndex +
        playerB.handicapIndex,
      defending: false,
    });
  }

  return pairs;
}

function createPairsKnockout(
  players: Player[],
  defendingPairIds: [string, string] | null
): KnockoutBracket {
  const pairs = createRandomPairing(
    players,
    defendingPairIds
  );

  /*
   * The actual pairing is random (except the defending pair).
   * Combined HI is then used for seeding only.
   * Where there is no defending pair, the best six pairs are
   * Seeds 1–6.
   */
  const ranked = [...pairs].sort(
    (a, b) =>
      a.combinedHI - b.combinedHI
  );

  if (defendingPairIds) {
    // Defending pair must remain Seed 1.
    pairs.forEach((pair) => {
      if (pair.defending) {
        pair.seed = 1;
      }
    });

    let seed = 2;

    ranked
      .filter((pair) => !pair.defending)
      .slice(0, 5)
      .forEach((pair) => {
        pair.seed = seed;
        seed += 1;
      });
  } else {
    ranked
      .slice(0, 6)
      .forEach((pair, index) => {
        pair.seed = index + 1;
      });
  }

  const bracketSize =
    nextPowerOfTwo(pairs.length);

  const rounds =
    Math.log2(bracketSize);

  /*
   * Standard bracket seed placement. Seed 1 is placed
   * automatically into the first seeded bracket position,
   * with the remaining seeded pairs distributed around it.
   */
  const seededPairs = [...pairs]
    .filter(
      (pair) => pair.seed !== undefined
    )
    .sort(
      (a, b) =>
        (a.seed ?? 99) -
        (b.seed ?? 99)
    );

  const seededPositions =
    buildSeedPositions(
      bracketSize,
      seededPairs.length
    );

  const occupied =
    new Set(seededPositions);

  const remainingPositions =
    Array.from(
      { length: bracketSize },
      (_, index) => index
    ).filter(
      (index) => !occupied.has(index)
    );

  const unseededPairs =
    shufflePlayers(
      pairs
        .filter(
          (pair) =>
            pair.seed === undefined
        )
        .map(
          (pair) =>
            ({
              id: pair.id,
              firstName: "",
              lastName: "",
              handicapIndex: 0,
              status: "Registered",
              source: "Manual",
              paid: false,
              notes: "",
            }) as Player
        )
    );

  const unseededMap =
    new Map(
      pairs.map((pair) => [
        pair.id,
        pair,
      ])
    );

  const slots:
    (PairEntrant | null)[] =
    Array.from(
      { length: bracketSize },
      () => null
    );

  seededPairs.forEach(
    (pair, index) => {
      const position =
        seededPositions[index];

      if (position !== undefined) {
        slots[position] = pair;
      }
    }
  );

  unseededPairs.forEach(
    (stub, index) => {
      const pair =
        unseededMap.get(stub.id);

      const position =
        remainingPositions[index];

      if (
        pair &&
        position !== undefined
      ) {
        slots[position] = pair;
      }
    }
  );

  const matches: KnockoutMatch[] = [];
  let matchNumber = 1;

  for (
    let round = 1;
    round <= rounds;
    round += 1
  ) {
    const matchesInRound =
      bracketSize /
      Math.pow(2, round);

    for (
      let index = 0;
      index < matchesInRound;
      index += 1
    ) {
      if (round === 1) {
        const pairA =
          slots[index * 2] ?? null;
        const pairB =
          slots[index * 2 + 1] ?? null;

        matches.push({
          matchNumber,
          round,
          slotA: pairA
            ? {
                seed: pairA.seed,
                playerId: pairA.id,
                playerName:
                  `${pairA.playerA.firstName} ${pairA.playerA.lastName} / ${pairA.playerB.firstName} ${pairA.playerB.lastName}`,
              }
            : {},
          slotB: pairB
            ? {
                seed: pairB.seed,
                playerId: pairB.id,
                playerName:
                  `${pairB.playerA.firstName} ${pairB.playerA.lastName} / ${pairB.playerB.firstName} ${pairB.playerB.lastName}`,
              }
            : {},
        });
      } else {
        matches.push({
          matchNumber,
          round,
          slotA: {},
          slotB: {},
        });
      }

      matchNumber += 1;
    }
  }

  return {
    entrants: pairs.length,
    bracketSize,
    rounds,
    matches,
  };
}

function nextPowerOfTwo(value: number): number {
  let result = 1;

  while (result < value) {
    result *= 2;
  }

  return result;
}

function buildSeedPositions(
  bracketSize: number,
  seededCount: number
): number[] {
  let positions = [1, 2];

  while (positions.length < bracketSize) {
    const size = positions.length * 2;
    const next: number[] = [];

    positions.forEach((seed) => {
      next.push(seed, size + 1 - seed);
    });

    positions = next;
  }

  return positions
    .slice(0, seededCount)
    .map((seed) => seed - 1);
}

function createSinglesKnockout(
  players: Player[]
): KnockoutBracket {
  const ordered = [...players].sort(
    (a, b) =>
      a.handicapIndex - b.handicapIndex
  );

  const bracketSize = nextPowerOfTwo(
    ordered.length
  );

  const rounds = Math.log2(
    bracketSize
  );

  const seededCount = Math.min(
    10,
    ordered.length
  );

  /*
   * Top ten players are HI-seeded.
   * Lower HI = higher seed.
   */
  const seeds = ordered
    .slice(0, seededCount)
    .map((player, index) => ({
      player,
      seed: index + 1,
    }));

  /*
   * Remaining players are randomly allocated
   * to all remaining bracket positions.
   */
  const seededPositions =
    buildSeedPositions(
      bracketSize,
      seededCount
    );

  const seededPositionSet =
    new Set(seededPositions);

  const remainingPositions =
    Array.from(
      { length: bracketSize },
      (_, index) => index
    ).filter(
      (position) =>
        !seededPositionSet.has(position)
    );

  const shuffledRemaining =
    shufflePlayers(
      ordered.slice(seededCount)
    );

  const slots: KnockoutSlot[] =
    Array.from(
      { length: bracketSize },
      () => ({})
    );

  seeds.forEach(
    ({ player, seed }, index) => {
      const position =
        seededPositions[index];

      if (position === undefined) {
        return;
      }

      slots[position] = {
        seed,
        playerId: player.id,
        playerName:
          `${player.firstName} ${player.lastName}`,
      };
    }
  );

  shuffledRemaining.forEach(
    (player, index) => {
      const position =
        remainingPositions[index];

      if (position === undefined) {
        return;
      }

      slots[position] = {
        playerId: player.id,
        playerName:
          `${player.firstName} ${player.lastName}`,
      };
    }
  );

  const matches: KnockoutMatch[] = [];

  /*
   * Only Round 1 is populated with players/byes.
   * Later rounds are represented by empty route
   * slots, so the complete tree is visible.
   */
  let matchNumber = 1;

  for (
    let round = 1;
    round <= rounds;
    round += 1
  ) {
    const matchesInRound =
      bracketSize /
      Math.pow(2, round);

    for (
      let index = 0;
      index < matchesInRound;
      index += 1
    ) {
      if (round === 1) {
        const slotA = slots[index * 2] ?? {};
        const slotB = slots[index * 2 + 1] ?? {};

        matches.push({
          matchNumber,
          round,
          slotA,
          slotB,
        });
      } else {
        matches.push({
          matchNumber,
          round,
          slotA: {},
          slotB: {},
        });
      }

      matchNumber += 1;
    }
  }

  return {
    entrants: ordered.length,
    bracketSize,
    rounds,
    matches,
  };
}

function knockoutRoundName(
  round: number,
  rounds: number
): string {
  if (round === rounds) {
    return "Final";
  }

  if (round === rounds - 1) {
    return "Semi-Finals";
  }

  if (round === rounds - 2) {
    return "Quarter-Finals";
  }

  if (round === 1) {
    return "Round 1";
  }

  return `Round ${round}`;
}

function knockoutStatus(
  slot: KnockoutSlot
): string {
  if (slot.seed !== undefined) {
    return `#${slot.seed} ${slot.playerName ?? ""}`;
  }

  return slot.playerName ?? "BYE";
}

function formatHI(
  value: number
): string {
  return value < 0
    ? `+${Math.abs(value).toFixed(1)}`
    : value.toFixed(1);
}

export default function FieldManagement({
  event,
  players,
  setPlayers,
  onExportPrint,
}: FieldManagementProps) {
  // Field Management state must belong to the Event Desk event itself.
  // Event records are identified by eventNumber in App.tsx; Event does not
  // carry a separate id/eventId field. Using those missing fields caused
  // every event to fall back to the same ":event" storage key.
  const [showMenuOverview, setShowMenuOverview] = useState(false);

  const eventStorageIdentity = event.eventNumber.trim() || "event";

  const STORAGE_KEY =
    `${STORAGE_KEY_PREFIX}:${eventStorageIdentity}`;

  const registeredPlayers =
    players.filter(
      (player) =>
        player.status === "Registered"
    );

  // The Players register is the single source of truth for an existing start list.
  // Players already imports/merges Tee Time and Group into each player record.
  // Field Management only derives a chronological view from those player records;
  // it does not maintain a second start-list dataset.
  const existingStartList: ExistingStartListRow[] = registeredPlayers
    .filter(
      (player) =>
        Boolean(player.teeTime?.trim()) &&
        Boolean(player.group?.trim())
    )
    .map((player) => ({
      id: player.id,
      teeTime: player.teeTime?.trim() ?? "",
      group: player.group?.trim() ?? "",
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`.trim(),
      homeClub: player.homeClub?.trim() ?? "",
      handicapIndex: Number.isFinite(player.handicapIndex)
        ? player.handicapIndex
        : null,
    }))
    .sort(
      (a, b) =>
        a.teeTime.localeCompare(b.teeTime, undefined, { numeric: true }) ||
        a.group.localeCompare(b.group, undefined, { numeric: true }) ||
        a.playerName.localeCompare(b.playerName)
    );

  const reserveCount =
    players.filter(
      (player) =>
        player.status === "Waiting"
    ).length;

  const playerCount =
    registeredPlayers.length;

  function buildPlayerSignature(playerList: Player[]): string {
    return playerList
      .filter((player) => player.status === "Registered")
      .map((player) => player.id)
      .sort()
      .join("|");
  }

  const playerSignature =
    buildPlayerSignature(players);

  const initialState = (() => {
    try {
      const raw =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!raw) {
        return null;
      }

      const saved =
        JSON.parse(
          raw
        ) as PersistedState;

      return saved.playerSignature ===
        playerSignature
        ? saved
        : null;
    } catch {
      return null;
    }
  })();

  const [
    selectedMethod,
    setSelectedMethod,
  ] = useState<DrawMethod | null>(
    initialState?.selectedMethod ??
      null
  );

  const [
    proposedDraw,
    setProposedDraw,
  ] = useState<DrawnPlayer[]>(
    initialState?.proposedDraw ?? []
  );

  const [
    confirmedDraw,
    setConfirmedDraw,
  ] = useState<DrawnPlayer[]>(
    initialState?.confirmedDraw ?? []
  );

  const [
    roundOneConfirmed,
    setRoundOneConfirmed,
  ] = useState(
    initialState?.roundOneConfirmed ??
      false
  );

  const [
    drawConfirmed,
    setDrawConfirmed,
  ] = useState(
    initialState?.drawConfirmed ??
      false
  );

  const [
    grossStage,
    setGrossStage,
  ] = useState<
    "round1" | "scores" | "round2"
  >(
    initialState?.grossStage ??
      "round1"
  );

  const [
    grossScores,
    setGrossScores,
  ] = useState<
    GrossScoreEntry[]
  >(
    initialState?.grossScores ?? []
  );

  const [
    nettStage,
    setNettStage,
  ] = useState<
    "round1" | "scores" | "round2"
  >(
    initialState?.nettStage ??
      "round1"
  );

  const [
    nettScores,
    setNettScores,
  ] = useState<NettScoreEntry[]>(
    initialState?.nettScores ?? []
  );

  const [
    knockoutBracket,
    setKnockoutBracket,
  ] = useState<KnockoutBracket | null>(
    initialState?.knockoutBracket ?? null
  );

  const [
    defendingPairIds,
    setDefendingPairIds,
  ] = useState<[string, string] | null>(
    initialState?.defendingPairIds ?? null
  );

  const [
    doublePairsStage,
    setDoublePairsStage,
  ] = useState<"pairs" | "matches">(
    initialState?.doublePairsStage ?? "pairs"
  );

  const [
    doubleDrawPairs,
    setDoubleDrawPairs,
  ] = useState<DoubleDrawPair[]>(
    initialState?.doubleDrawPairs ?? []
  );

  const [
    doubleDrawMatches,
    setDoubleDrawMatches,
  ] = useState<DoubleDrawMatch[]>(
    initialState?.doubleDrawMatches ?? []
  );

  const [
    clashRedTeam,
    setClashRedTeam,
  ] = useState<ClashTeamPlayer[]>(
    initialState?.clashRedTeam ?? []
  );

  const [
    clashBlueTeam,
    setClashBlueTeam,
  ] = useState<ClashTeamPlayer[]>(
    initialState?.clashBlueTeam ?? []
  );

  const [clashStage, setClashStage] = useState<"lineups" | "pairs" | "matches">(
    initialState?.clashStage ?? "lineups"
  );
  const [clashRedPairs, setClashRedPairs] = useState<ClashPair[]>(
    initialState?.clashRedPairs ?? []
  );
  const [clashBluePairs, setClashBluePairs] = useState<ClashPair[]>(
    initialState?.clashBluePairs ?? []
  );
  const [clashMatches, setClashMatches] = useState<ClashMatch[]>(
    initialState?.clashMatches ?? []
  );

  const [mixedClashRedMen, setMixedClashRedMen] = useState<ClashTeamPlayer[]>(
    initialState?.mixedClashRedMen ?? []
  );
  const [mixedClashRedLadies, setMixedClashRedLadies] = useState<ClashTeamPlayer[]>(
    initialState?.mixedClashRedLadies ?? []
  );
  const [mixedClashBlueMen, setMixedClashBlueMen] = useState<ClashTeamPlayer[]>(
    initialState?.mixedClashBlueMen ?? []
  );
  const [mixedClashBlueLadies, setMixedClashBlueLadies] = useState<ClashTeamPlayer[]>(
    initialState?.mixedClashBlueLadies ?? []
  );
  const [mixedClashStage, setMixedClashStage] = useState<"lineups" | "pairs" | "matches">(
    initialState?.mixedClashStage ?? "lineups"
  );
  const [mixedClashRedPairs, setMixedClashRedPairs] = useState<MixedClashPair[]>(
    initialState?.mixedClashRedPairs ?? []
  );
  const [mixedClashBluePairs, setMixedClashBluePairs] = useState<MixedClashPair[]>(
    initialState?.mixedClashBluePairs ?? []
  );
  const [mixedClashMatches, setMixedClashMatches] = useState<MixedClashMatch[]>(
    initialState?.mixedClashMatches ?? []
  );

  const [
    showPairsSetup,
    setShowPairsSetup,
  ] = useState(false);

  const [
    pairFirstId,
    setPairFirstId,
  ] = useState(
    initialState?.defendingPairIds?.[0] ?? ""
  );

  const [
    pairSecondId,
    setPairSecondId,
  ] = useState(
    initialState?.defendingPairIds?.[1] ?? ""
  );

  const isUsingExistingStartList =
    existingStartList.length > 0 &&
    selectedMethod === null &&
    proposedDraw.length === 0 &&
    confirmedDraw.length === 0 &&
    knockoutBracket === null;

  function persistState(
    override: Partial<PersistedState>
  ) {
    try {
      const state: PersistedState = {
        playerSignature,
        selectedMethod,
        proposedDraw,
        confirmedDraw,
        roundOneConfirmed,
        drawConfirmed,
        grossStage,
        grossScores,
        nettStage,
        nettScores,
        knockoutBracket,
        defendingPairIds,
        doublePairsStage,
        doubleDrawPairs,
        doubleDrawMatches,
        clashRedTeam,
        clashBlueTeam,
        clashStage,
        clashRedPairs,
        clashBluePairs,
        clashMatches,
        mixedClashRedMen,
        mixedClashRedLadies,
        mixedClashBlueMen,
        mixedClashBlueLadies,
        mixedClashStage,
        mixedClashRedPairs,
        mixedClashBluePairs,
        mixedClashMatches,
        ...override,
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch {
      // The working screen remains usable
      // if browser storage is unavailable.
    }
  }

  function selectMethod(
    method: DrawMethod
  ) {
    if (drawConfirmed) {
      return;
    }

    setSelectedMethod(method);
    setConfirmedDraw([]);
    setRoundOneConfirmed(false);
    setDrawConfirmed(false);
    setDoublePairsStage("pairs");
    setDoubleDrawPairs([]);
    setDoubleDrawMatches([]);

    if (
      method !== "singles" &&
      method !== "pairs"
    ) {
      setKnockoutBracket(null);
    }

    if (method !== "pairs") {
      setShowPairsSetup(false);
    }

    if (method === "random") {
      const nextDraw =
        createRandomDraw(
          registeredPlayers
        );

      setProposedDraw(nextDraw);
      setGrossStage("round1");
      setGrossScores([]);

      persistState({
        selectedMethod: method,
        proposedDraw: nextDraw,
        confirmedDraw: [],
        roundOneConfirmed: false,
        drawConfirmed: false,
        grossStage: "round1",
        grossScores: [],
      });

      return;
    }

    if (method === "handicap") {
      const nextDraw =
        createHandicapDraw(
          registeredPlayers
        );

      setProposedDraw(nextDraw);
      setGrossStage("round1");
      setGrossScores([]);

      persistState({
        selectedMethod: method,
        proposedDraw: nextDraw,
        confirmedDraw: [],
        roundOneConfirmed: false,
        drawConfirmed: false,
        grossStage: "round1",
        grossScores: [],
      });

      return;
    }

    if (method === "pairDraw") {
      const nextDraw =
        createPairsDraw(
          registeredPlayers
        );

      setProposedDraw(nextDraw);
      setGrossStage("round1");
      setGrossScores([]);
      setNettStage("round1");
      setNettScores([]);

      persistState({
        selectedMethod: method,
        proposedDraw: nextDraw,
        confirmedDraw: [],
        roundOneConfirmed: false,
        drawConfirmed: false,
        grossStage: "round1",
        grossScores: [],
        nettStage: "round1",
        nettScores: [],
      });

      return;
    }

    if (method === "doublePairs") {
      const pairs = createDoubleDrawPairs(registeredPlayers);

      setProposedDraw([]);
      setDoublePairsStage("pairs");
      setDoubleDrawPairs(pairs);
      setDoubleDrawMatches([]);

      persistState({
        selectedMethod: method,
        proposedDraw: [],
        confirmedDraw: [],
        roundOneConfirmed: false,
        drawConfirmed: false,
        doublePairsStage: "pairs",
        doubleDrawPairs: pairs,
        doubleDrawMatches: [],
      });

      return;
    }

    if (method === "clashPairs") {
      setProposedDraw([]);
      setConfirmedDraw([]);
      setRoundOneConfirmed(false);
      setDrawConfirmed(false);
      setClashStage("lineups");
      setClashRedPairs([]);
      setClashBluePairs([]);
      setClashMatches([]);

      persistState({
        selectedMethod: method,
        proposedDraw: [],
        confirmedDraw: [],
        roundOneConfirmed: false,
        drawConfirmed: false,
        clashRedTeam,
        clashBlueTeam,
        clashStage: "lineups",
        clashRedPairs: [],
        clashBluePairs: [],
        clashMatches: [],
      });

      return;
    }

    if (method === "mixedClashPairs") {
      setProposedDraw([]);
      setConfirmedDraw([]);
      setRoundOneConfirmed(false);
      setDrawConfirmed(false);

      persistState({
        selectedMethod: method,
        proposedDraw: [],
        confirmedDraw: [],
        roundOneConfirmed: false,
        drawConfirmed: false,
        mixedClashRedMen,
        mixedClashRedLadies,
        mixedClashBlueMen,
        mixedClashBlueLadies,
        mixedClashStage,
        mixedClashRedPairs,
        mixedClashBluePairs,
        mixedClashMatches,
      });
      return;
    }

    if (method === "balanced") {
      const nextDraw =
        createBalancedDraw(
          registeredPlayers
        );

      setProposedDraw(nextDraw);
      setGrossStage("round1");
      setGrossScores([]);
      setNettStage("round1");
      setNettScores([]);

      persistState({
        selectedMethod: method,
        proposedDraw: nextDraw,
        confirmedDraw: [],
        roundOneConfirmed: false,
        drawConfirmed: false,
        grossStage: "round1",
        grossScores: [],
        nettStage: "round1",
        nettScores: [],
      });

      return;
    }

    if (method === "pairs") {
      /*
       * Selecting Pairs Knockout only opens the setup screen.
       * It does NOT conduct any draw.
       */
      setProposedDraw([]);
      setKnockoutBracket(null);
      setDefendingPairIds(null);
      setPairFirstId("");
      setPairSecondId("");
      setShowPairsSetup(true);

      persistState({
        selectedMethod: method,
        proposedDraw: [],
        confirmedDraw: [],
        roundOneConfirmed: false,
        drawConfirmed: false,
        grossStage: "round1",
        grossScores: [],
        nettStage: "round1",
        nettScores: [],
        knockoutBracket: null,
        defendingPairIds: null,
      });

      return;
    }

    if (method === "singles") {
      const bracket =
        createSinglesKnockout(
          registeredPlayers
        );

      setProposedDraw([]);
      setKnockoutBracket(bracket);
      setGrossStage("round1");
      setGrossScores([]);
      setNettStage("round1");
      setNettScores([]);

      persistState({
        selectedMethod: method,
        proposedDraw: [],
        confirmedDraw: [],
        roundOneConfirmed: false,
        drawConfirmed: false,
        grossStage: "round1",
        grossScores: [],
        nettStage: "round1",
        nettScores: [],
        knockoutBracket: bracket,
      });

      return;
    }

    if (method === "gross") {
      const roundOne =
        createRandomDraw(
          registeredPlayers
        );

      const scores =
        registeredPlayers.map(
          (player) => ({
            playerId: player.id,
            gross: "",
          })
        );

      setProposedDraw(roundOne);
      setGrossStage("round1");
      setGrossScores(scores);

      persistState({
        selectedMethod: method,
        proposedDraw: roundOne,
        confirmedDraw: [],
        roundOneConfirmed: false,
        drawConfirmed: false,
        grossStage: "round1",
        grossScores: scores,
      });

      return;
    }

    if (method === "nett") {
      const roundOne =
        createRandomDraw(
          registeredPlayers
        );

      const scores =
        registeredPlayers.map(
          (player) => ({
            playerId: player.id,
            gross: "",
            playingHandicap: "",
          })
        );

      setProposedDraw(roundOne);
      setNettStage("round1");
      setNettScores(scores);

      persistState({
        selectedMethod: method,
        proposedDraw: roundOne,
        confirmedDraw: [],
        roundOneConfirmed: false,
        drawConfirmed: false,
        grossStage: "round1",
        grossScores: [],
        nettStage: "round1",
        nettScores: scores,
      });

      return;
    }

    setProposedDraw([]);
    setGrossStage("round1");
    setGrossScores([]);
    setNettStage("round1");
    setNettScores([]);
    setKnockoutBracket(null);
    setDefendingPairIds(null);
    setShowPairsSetup(false);
    setPairFirstId("");
    setPairSecondId("");

    persistState({
      selectedMethod: method,
      proposedDraw: [],
      confirmedDraw: [],
      roundOneConfirmed: false,
      drawConfirmed: false,
      grossStage: "round1",
      grossScores: [],
      nettStage: "round1",
      nettScores: [],
    });
  }

  function clashPlayerToMasterPlayer(
    player: ClashTeamPlayer,
    notes: string,
    gender?: "Male" | "Female"
  ): Player {
    return {
      id: crypto.randomUUID(),
      firstName: player.firstName,
      lastName: player.lastName,
      handicapIndex: player.handicapIndex,
      ...(gender ? { gender } : {}),
      status: "Registered",
      source: "CSV",
      paid: false,
      notes,
    } as Player;
  }

  function conductConfirm() {
    if (!selectedMethod) {
      return;
    }

    /*
     * Championship Gross — Round 1.
     * Confirming the first round moves to
     * score entry. It does NOT lock the page
     * as a final draw.
     */
    if (
      selectedMethod === "gross" &&
      grossStage === "round1"
    ) {
      if (
        proposedDraw.length === 0
      ) {
        return;
      }

      setConfirmedDraw(
        proposedDraw
      );
      setRoundOneConfirmed(true);
      setDrawConfirmed(false);
      setGrossStage("scores");

      persistState({
        confirmedDraw: proposedDraw,
        roundOneConfirmed: true,
        drawConfirmed: false,
        grossStage: "scores",
      });

      return;
    }

    /*
     * Championship Gross — score entry.
     * Valid scores generate the Round 2
     * proposed starting order.
     */
    if (
      selectedMethod === "gross" &&
      grossStage === "scores"
    ) {
      const incomplete =
        grossScores.some(
          (entry) =>
            entry.gross.trim() === "" ||
            !Number.isFinite(
              Number(entry.gross)
            ) ||
            Number(entry.gross) <= 0
        );

      if (incomplete) {
        window.alert(
          "Please enter a valid Round 1 gross score for every player before continuing."
        );
        return;
      }

      const roundTwo =
        createRoundTwoGrossDraw(
          registeredPlayers,
          grossScores
        );

      setProposedDraw(roundTwo);
      setConfirmedDraw([]);
      setGrossStage("round2");
      setDrawConfirmed(false);

      persistState({
        proposedDraw: roundTwo,
        confirmedDraw: [],
        roundOneConfirmed: true,
        drawConfirmed: false,
        grossStage: "round2",
        grossScores,
      });

      return;
    }

    /*
     * Championship Gross — Round 2.
     * The proposed Round 2 order is now
     * formally confirmed.
     */
    if (
      selectedMethod === "gross" &&
      grossStage === "round2"
    ) {
      if (
        proposedDraw.length === 0
      ) {
        return;
      }

      setConfirmedDraw(
        proposedDraw
      );
      setDrawConfirmed(true);

      persistState({
        proposedDraw,
        confirmedDraw: proposedDraw,
        roundOneConfirmed: true,
        drawConfirmed: true,
        grossStage: "round2",
        grossScores,
      });

      return;
    }

    if (
      selectedMethod === "nett" &&
      nettStage === "round1"
    ) {
      if (proposedDraw.length === 0) return;

      setConfirmedDraw(proposedDraw);
      setRoundOneConfirmed(true);
      setDrawConfirmed(false);
      setNettStage("scores");

      persistState({
        confirmedDraw: proposedDraw,
        roundOneConfirmed: true,
        drawConfirmed: false,
        nettStage: "scores",
      });

      return;
    }

    if (
      selectedMethod === "nett" &&
      nettStage === "scores"
    ) {
      const incomplete = nettScores.some(
        (entry) =>
          entry.gross.trim() === "" ||
          entry.playingHandicap.trim() === "" ||
          !Number.isFinite(Number(entry.gross)) ||
          !Number.isFinite(Number(entry.playingHandicap))
      );

      if (incomplete) {
        window.alert(
          "Please enter a valid Round 1 gross score and Playing Handicap for every player before continuing."
        );
        return;
      }

      const roundTwo =
        createRoundTwoNettDraw(
          registeredPlayers,
          nettScores
        );

      setProposedDraw(roundTwo);
      setConfirmedDraw([]);
      setNettStage("round2");
      setDrawConfirmed(false);

      persistState({
        proposedDraw: roundTwo,
        confirmedDraw: [],
        roundOneConfirmed: true,
        drawConfirmed: false,
        nettStage: "round2",
        nettScores,
      });

      return;
    }

    if (
      selectedMethod === "nett" &&
      nettStage === "round2"
    ) {
      if (proposedDraw.length === 0) return;

      setConfirmedDraw(proposedDraw);
      setDrawConfirmed(true);

      persistState({
        proposedDraw,
        confirmedDraw: proposedDraw,
        roundOneConfirmed: true,
        drawConfirmed: true,
        nettStage: "round2",
        nettScores,
      });

      return;
    }

    if (selectedMethod === "mixedClashPairs") {
      if (mixedClashStage === "pairs") {
        try {
          const matches = createMixedClashMatches(
            mixedClashRedPairs,
            mixedClashBluePairs
          );

          setMixedClashMatches(matches);
          setMixedClashStage("matches");
          setDrawConfirmed(true);

          persistState({
            selectedMethod: "mixedClashPairs",
            mixedClashStage: "matches",
            mixedClashRedMen,
            mixedClashRedLadies,
            mixedClashBlueMen,
            mixedClashBlueLadies,
            mixedClashRedPairs,
            mixedClashBluePairs,
            mixedClashMatches: matches,
            drawConfirmed: true,
          });
        } catch (error) {
          window.alert(
            error instanceof Error
              ? error.message
              : "The Mixed Clash Red v Blue matches could not be drawn."
          );
        }
        return;
      }

      if (mixedClashStage !== "lineups") return;

      if (
        mixedClashRedMen.length === 0 ||
        mixedClashRedLadies.length === 0 ||
        mixedClashBlueMen.length === 0 ||
        mixedClashBlueLadies.length === 0
      ) {
        return;
      }

      if (
        mixedClashRedMen.length !== mixedClashRedLadies.length ||
        mixedClashBlueMen.length !== mixedClashBlueLadies.length
      ) {
        window.alert(
          "For this Mixed Clash draw, each colour must currently have the same number of Men and Ladies. Please correct the four lists before continuing."
        );
        return;
      }

      if (mixedClashRedMen.length !== mixedClashBlueMen.length) {
        window.alert(
          "Red and Blue must currently contain the same number of mixed pairs before continuing."
        );
        return;
      }

      if (players.length > 0) {
        window.alert(
          "This event already contains players on the Players page. Mixed Clash line-ups have not been added or merged. Use a clean/new event with an empty Players page before confirming the line-ups."
        );
        return;
      }

      const mixedClashMasterPlayers: Player[] = [
        ...mixedClashRedMen.map((player, index) =>
          clashPlayerToMasterPlayer(
            player,
            index === 0 ? "Mixed Clash — Red Men — Captain" : "Mixed Clash — Red Men",
            "Male"
          )
        ),
        ...mixedClashRedLadies.map((player, index) =>
          clashPlayerToMasterPlayer(
            player,
            index === 0 ? "Mixed Clash — Red Ladies — Captain" : "Mixed Clash — Red Ladies",
            "Female"
          )
        ),
        ...mixedClashBlueMen.map((player, index) =>
          clashPlayerToMasterPlayer(
            player,
            index === 0 ? "Mixed Clash — Blue Men — Captain" : "Mixed Clash — Blue Men",
            "Male"
          )
        ),
        ...mixedClashBlueLadies.map((player, index) =>
          clashPlayerToMasterPlayer(
            player,
            index === 0 ? "Mixed Clash — Blue Ladies — Captain" : "Mixed Clash — Blue Ladies",
            "Female"
          )
        ),
      ];

      setPlayers(mixedClashMasterPlayers);
      const mixedClashMasterSignature =
        buildPlayerSignature(mixedClashMasterPlayers);

      try {
        const redPairs = createMixedClashPairs(
          mixedClashRedMen,
          mixedClashRedLadies,
          "red"
        );
        const bluePairs = createMixedClashPairs(
          mixedClashBlueMen,
          mixedClashBlueLadies,
          "blue"
        );

        setMixedClashRedPairs(redPairs);
        setMixedClashBluePairs(bluePairs);
        setMixedClashMatches([]);
        setMixedClashStage("pairs");
        setDrawConfirmed(false);

        persistState({
          playerSignature: mixedClashMasterSignature,
          selectedMethod: "mixedClashPairs",
          mixedClashStage: "pairs",
          mixedClashRedMen,
          mixedClashRedLadies,
          mixedClashBlueMen,
          mixedClashBlueLadies,
          mixedClashRedPairs: redPairs,
          mixedClashBluePairs: bluePairs,
          mixedClashMatches: [],
          drawConfirmed: false,
        });
      } catch (error) {
        window.alert(
          error instanceof Error
            ? error.message
            : "The Mixed Clash pairs could not be drawn."
        );
      }
      return;
    }

    if (selectedMethod === "clashPairs") {
      if (clashRedTeam.length === 0 || clashBlueTeam.length === 0) return;

      if (clashStage === "lineups") {
        const teamSizeDifference = Math.abs(
          clashRedTeam.length - clashBlueTeam.length
        );

        if (teamSizeDifference > 1) {
          window.alert(
            "Clash team line-ups must be equal in size or differ by only one player. Please correct the Red and Blue team lists before continuing."
          );
          return;
        }

        if (players.length > 0) {
          window.alert(
            "This event already contains players on the Players page. Clash line-ups have not been added or merged. Use a clean/new event with an empty Players page before confirming the line-ups."
          );
          return;
        }

        const clashMasterPlayers: Player[] = [
          ...clashRedTeam.map((player, index) =>
            clashPlayerToMasterPlayer(
              player,
              index === 0 ? "Clash Pairs — Red Team — Captain" : "Clash Pairs — Red Team"
            )
          ),
          ...clashBlueTeam.map((player, index) =>
            clashPlayerToMasterPlayer(
              player,
              index === 0 ? "Clash Pairs — Blue Team — Captain" : "Clash Pairs — Blue Team"
            )
          ),
        ];

        setPlayers(clashMasterPlayers);
        const clashMasterSignature =
          buildPlayerSignature(clashMasterPlayers);

        const targetSize = Math.max(clashRedTeam.length, clashBlueTeam.length);
        const evenTargetSize = targetSize % 2 === 0 ? targetSize : targetSize + 1;
        const redPairs = createClashPairs(clashRedTeam, "red", evenTargetSize);
        const bluePairs = createClashPairs(clashBlueTeam, "blue", evenTargetSize);
        setClashRedPairs(redPairs);
        setClashBluePairs(bluePairs);
        setClashMatches([]);
        setClashStage("pairs");
        setDrawConfirmed(false);
        persistState({
            playerSignature: clashMasterSignature,
          selectedMethod: "clashPairs",
          clashStage: "pairs",
          clashRedTeam,
          clashBlueTeam,
          clashRedPairs: redPairs,
          clashBluePairs: bluePairs,
          clashMatches: [],
          drawConfirmed: false,
        });
        return;
      }

      if (clashStage === "pairs") {
        if (clashRedPairs.length === 0 || clashBluePairs.length === 0) return;
        const matches = createClashMatches(clashRedPairs, clashBluePairs);
        setClashMatches(matches);
        setClashStage("matches");
        setDrawConfirmed(false);
        persistState({
          selectedMethod: "clashPairs",
          clashStage: "matches",
          clashRedPairs,
          clashBluePairs,
          clashMatches: matches,
          drawConfirmed: false,
        });
        return;
      }

      if (clashMatches.length === 0) return;
      setDrawConfirmed(true);
      persistState({
        selectedMethod: "clashPairs",
        clashStage: "matches",
        clashRedPairs,
        clashBluePairs,
        clashMatches,
        drawConfirmed: true,
      });
      return;
    }


    if (selectedMethod === "doublePairs") {
      if (doublePairsStage === "pairs") {
        if (doubleDrawPairs.length === 0) return;

        const matches = createDoubleDrawMatches(doubleDrawPairs);
        setDoubleDrawMatches(matches);
        setDoublePairsStage("matches");
        setDrawConfirmed(false);

        persistState({
          selectedMethod: "doublePairs",
          doublePairsStage: "matches",
          doubleDrawPairs,
          doubleDrawMatches: matches,
          drawConfirmed: false,
        });
        return;
      }

      if (doubleDrawMatches.length === 0) return;

      setDrawConfirmed(true);
      persistState({
        selectedMethod: "doublePairs",
        doublePairsStage: "matches",
        doubleDrawPairs,
        doubleDrawMatches,
        drawConfirmed: true,
      });
      return;
    }

    if (
      selectedMethod === "pairs"
    ) {
      if (!knockoutBracket) {
        const validDefendingPair =
          pairFirstId !== "" &&
          pairSecondId !== "" &&
          pairFirstId !== pairSecondId;

        const selectedDefendingPair =
          validDefendingPair
            ? [
                pairFirstId,
                pairSecondId,
              ] as [string, string]
            : null;

        const bracket =
          createPairsKnockout(
            registeredPlayers,
            selectedDefendingPair
          );

        setDefendingPairIds(
          selectedDefendingPair
        );
        setKnockoutBracket(
          bracket
        );
        setShowPairsSetup(false);
        setDrawConfirmed(false);

        persistState({
          selectedMethod: "pairs",
          proposedDraw: [],
          confirmedDraw: [],
          roundOneConfirmed: false,
          drawConfirmed: false,
          knockoutBracket: bracket,
          defendingPairIds:
            selectedDefendingPair,
        });

        return;
      }

      setDrawConfirmed(true);

      persistState({
        drawConfirmed: true,
        knockoutBracket,
        defendingPairIds,
      });

      return;
    }

    if (
      selectedMethod === "singles"
    ) {
      if (!knockoutBracket) return;

      setDrawConfirmed(true);

      persistState({
        confirmedDraw: [],
        drawConfirmed: true,
        knockoutBracket,
      });

      return;
    }

    /*
     * Other completed draw methodologies.
     */
    if (
      proposedDraw.length === 0
    ) {
      return;
    }

    setConfirmedDraw(
      proposedDraw
    );
    setDrawConfirmed(true);

    persistState({
      confirmedDraw: proposedDraw,
      drawConfirmed: true,
    });
  }

  function resetDraw() {
    if (
      drawConfirmed ||
      roundOneConfirmed
    ) {
      const confirmed =
        window.confirm(
          "This will undo the current draw and any Round 1 score entry. Continue?"
        );

      if (!confirmed) {
        return;
      }
    }

    setSelectedMethod(null);
    setProposedDraw([]);
    setConfirmedDraw([]);
    setRoundOneConfirmed(false);
    setDrawConfirmed(false);
    setGrossStage("round1");
    setGrossScores([]);
    setNettStage("round1");
    setNettScores([]);
    setKnockoutBracket(null);
    setDefendingPairIds(null);
    setShowPairsSetup(false);
    setPairFirstId("");
    setPairSecondId("");
    setDoublePairsStage("pairs");
    setDoubleDrawPairs([]);
    setDoubleDrawMatches([]);
    setClashRedTeam([]);
    setClashBlueTeam([]);
    setClashStage("lineups");
    setClashRedPairs([]);
    setClashBluePairs([]);
    setClashMatches([]);
    setMixedClashRedMen([]);
    setMixedClashRedLadies([]);
    setMixedClashBlueMen([]);
    setMixedClashBlueLadies([]);
    setMixedClashStage("lineups");
    setMixedClashRedPairs([]);
    setMixedClashBluePairs([]);
    setMixedClashMatches([]);

    try {
      localStorage.removeItem(
        STORAGE_KEY
      );
    } catch {
      // Ignore storage failure.
    }
  }

  function getRoundOneGross(playerId: string): string {
    return (
      grossScores.find(
        (entry) => entry.playerId === playerId
      )?.gross ?? ""
    );
  }

  function updateNettScore(
    playerId: string,
    field: "gross" | "playingHandicap",
    value: string
  ) {
    setNettScores((current) => {
      const next =
        current.map((entry) =>
          entry.playerId === playerId
            ? {
                ...entry,
                [field]: value,
              }
            : entry
        );

      persistState({
        nettScores: next,
      });

      return next;
    });
  }

  function updateGrossScore(
    playerId: string,
    value: string
  ) {
    setGrossScores((current) => {
      const next =
        current.map(
          (entry) =>
            entry.playerId ===
              playerId
              ? {
                  ...entry,
                  gross: value,
                }
              : entry
        );

      persistState({
        grossScores: next,
      });

      return next;
    });
  }

  async function importClashTeam(
    file: File | undefined,
    team: "red" | "blue"
  ) {
    if (!file) return;

    try {
      const text = await file.text();
      const imported = parseClashTeamCsv(text, team);
      setClashStage("lineups");
      setClashRedPairs([]);
      setClashBluePairs([]);
      setClashMatches([]);
      setDrawConfirmed(false);

      if (team === "red") {
        setClashRedTeam(imported);
        persistState({
          selectedMethod: "clashPairs",
          clashRedTeam: imported,
          clashBlueTeam,
          clashStage: "lineups",
          clashRedPairs: [],
          clashBluePairs: [],
          clashMatches: [],
          drawConfirmed: false,
        });
      } else {
        setClashBlueTeam(imported);
        persistState({
          selectedMethod: "clashPairs",
          clashRedTeam,
          clashBlueTeam: imported,
          clashStage: "lineups",
          clashRedPairs: [],
          clashBluePairs: [],
          clashMatches: [],
          drawConfirmed: false,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The Clash team CSV could not be imported.";
      window.alert(message);
    }
  }


  async function importMixedClashTeam(
    file: File | undefined,
    section: "redMen" | "redLadies" | "blueMen" | "blueLadies"
  ) {
    if (!file) return;

    try {
      const text = await file.text();
      const side = section.startsWith("red") ? "red" : "blue";
      const imported = parseClashTeamCsv(text, side);
      setDrawConfirmed(false);
      setMixedClashStage("lineups");
      setMixedClashRedPairs([]);
      setMixedClashBluePairs([]);
      setMixedClashMatches([]);

      const override: Partial<PersistedState> = {
        selectedMethod: "mixedClashPairs",
        drawConfirmed: false,
        mixedClashRedMen,
        mixedClashRedLadies,
        mixedClashBlueMen,
        mixedClashBlueLadies,
        mixedClashStage: "lineups",
        mixedClashRedPairs: [],
        mixedClashBluePairs: [],
        mixedClashMatches: [],
      };

      if (section === "redMen") {
        setMixedClashRedMen(imported);
        override.mixedClashRedMen = imported;
      } else if (section === "redLadies") {
        setMixedClashRedLadies(imported);
        override.mixedClashRedLadies = imported;
      } else if (section === "blueMen") {
        setMixedClashBlueMen(imported);
        override.mixedClashBlueMen = imported;
      } else {
        setMixedClashBlueLadies(imported);
        override.mixedClashBlueLadies = imported;
      }

      persistState(override);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The Mixed Clash team CSV could not be imported.";
      window.alert(message);
    }
  }

  const groupCount =
    isUsingExistingStartList
      ? new Set(existingStartList.map((row) => row.group)).size
      : selectedMethod === "pairDraw"
      ? Math.ceil(playerCount / 2)
      : selectedMethod === "doublePairs"
      ? doublePairsStage === "matches"
        ? doubleDrawMatches.length
        : doubleDrawPairs.length
      : selectedMethod === "mixedClashPairs"
      ? mixedClashStage === "matches"
        ? mixedClashMatches.length
        : mixedClashStage === "pairs"
        ? Math.max(mixedClashRedPairs.length, mixedClashBluePairs.length)
        : Math.max(
            mixedClashRedMen.length,
            mixedClashRedLadies.length,
            mixedClashBlueMen.length,
            mixedClashBlueLadies.length
          )
      : selectedMethod === "clashPairs"
      ? clashStage === "matches"
        ? clashMatches.length
        : clashStage === "pairs"
        ? Math.max(clashRedPairs.length, clashBluePairs.length)
        : Math.max(
            Math.ceil(clashRedTeam.length / 2),
            Math.ceil(clashBlueTeam.length / 2)
          )
      : getGroupSizes(
          playerCount,
          true
        ).length;

  let drawStatus =
    isUsingExistingStartList
      ? "Existing Start List"
      : "Not Started";

  if (
    selectedMethod === "gross" &&
    grossStage === "scores"
  ) {
    drawStatus =
      "Round 1 Confirmed";
  } else if (
    selectedMethod === "gross" &&
    grossStage === "round2" &&
    proposedDraw.length > 0
  ) {
    drawStatus =
      drawConfirmed
        ? "Confirmed"
        : "Round 2 Proposed";
  } else if (
    selectedMethod === "nett" &&
    nettStage === "scores"
  ) {
    drawStatus =
      "Round 1 Confirmed";
  } else if (
    selectedMethod === "nett" &&
    nettStage === "round2" &&
    proposedDraw.length > 0
  ) {
    drawStatus =
      drawConfirmed
        ? "Confirmed"
        : "Round 2 Proposed";
  } else if (
    selectedMethod === "doublePairs" &&
    doubleDrawPairs.length > 0
  ) {
    drawStatus = drawConfirmed
      ? "Confirmed"
      : doublePairsStage === "matches"
      ? "Matches Proposed"
      : "Pairs Drawn";
  } else if (
    selectedMethod === "clashPairs"
  ) {
    drawStatus = drawConfirmed
      ? "Confirmed"
      : clashStage === "matches"
      ? "Matches Proposed"
      : clashStage === "pairs"
      ? "Pairs Drawn"
      : clashRedTeam.length > 0 || clashBlueTeam.length > 0
      ? "Team Line-ups"
      : "Awaiting Teams";
  } else if (
    (
      selectedMethod === "singles" ||
      selectedMethod === "pairs"
    ) &&
    knockoutBracket
  ) {
    drawStatus =
      drawConfirmed
        ? "Confirmed"
        : "Proposed";
  } else if (drawConfirmed) {
    drawStatus =
      "Confirmed";
  } else if (
    proposedDraw.length > 0
  ) {
    drawStatus =
      "Proposed";
  }

  const selectedTitle =
    drawMethods.find(
      (method) =>
        method.key ===
        selectedMethod
    )?.title ?? "";

  const summary = (
    <div className="page-summary">
      <SummaryCard
        title="Players"
        value={playerCount.toString()}
      />
      <SummaryCard
        title="Groups"
        value={groupCount.toString()}
      />
      <SummaryCard
        title="Spaces"
        value={Math.max(
          0,
          (event.playerLimit || 0) - playerCount
        ).toString()}
      />
      <SummaryCard
        title="Reserves"
        value={reserveCount.toString()}
      />
      <SummaryCard
        title="Draw"
        value={drawStatus}
      />
    </div>
  );

  const drawOptions = (
    <div
      className="page-actions"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 136px)",
        justifyContent: "center",
        gap: "0.75rem",
      }}
    >
      {drawMethods.map(
        ({
          key,
          title,
          icon: Icon,
        }) => (
          <ActionTile
            key={key}
            icon={Icon}
            title={title}
            primary={
              selectedMethod ===
              key
            }
            onClick={() =>
              selectMethod(key)
            }
            disabled={
              drawConfirmed ||
              (
                selectedMethod === "gross" &&
                grossStage === "scores"
              ) ||
              (
                selectedMethod === "nett" &&
                nettStage === "scores"
              ) ||
              (
                selectedMethod === "pairs" &&
                key !== "pairs" &&
                showPairsSetup
              )
            }
          />
        )
      )}
      <ActionTile
        icon={Construction}
        title="FD1"
        onClick={() => undefined}
        disabled
      />
      <ActionTile
        icon={Construction}
        title="FD2"
        onClick={() => undefined}
        disabled
      />
      <ActionTile
        icon={BookOpen}
        title="Menu Overview"
        onClick={() => setShowMenuOverview(true)}
      />
    </div>
  );

  const menuOverviewItems: {
    title: string;
    icon: typeof Shuffle;
    description: string;
    muted?: boolean;
  }[] = [
    {
      title: "Random Draw",
      icon: Shuffle,
      description:
        "Randomly shuffles the registered players into playing groups, with smaller groups placed first where needed.",
    },
    {
      title: "HI Draw",
      icon: ListOrdered,
      description:
        "Orders players by Handicap Index and allocates them into groups in HI order.",
    },
    {
      title: "Championship Gross",
      icon: Trophy,
      description:
        "Creates the championship Round 1 field, accepts gross scores, then produces the Round 2 order with the better gross scores starting later.",
    },
    {
      title: "Championship Nett",
      icon: Trophy,
      description:
        "Creates the championship Round 1 field, accepts gross score and playing handicap, then produces the Round 2 order from nett scores.",
    },
    {
      title: "Balanced",
      icon: Scale,
      description:
        "Builds groups with a spread of Handicap Indexes and balances the aggregate HI between the groups as closely as practical.",
    },
    {
      title: "Singles Knockout",
      icon: Swords,
      description:
        "Creates a singles knockout bracket, using Handicap Index to seed the leading players and arrange the remaining draw.",
    },
    {
      title: "Pairs Draw",
      icon: Users,
      description:
        "Randomly draws players into pairs. If the field is odd, a pending vacant position is created in the final pair.",
    },
    {
      title: "Double Draw Pairs",
      icon: Shuffle,
      description:
        "First randomly draws the players into pairs, then performs a second random draw to match those pairs against each other.",
    },
    {
      title: "Clash Pairs",
      icon: Swords,
      description:
        "Imports predetermined Red and Blue team lists, forms random pairs within each team, then draws Red pairs against Blue pairs. Captain pairs lead the draw.",
    },
    {
      title: "Mixed Clash Pairs",
      icon: Users,
      description:
        "Imports Red Men, Red Ladies, Blue Men and Blue Ladies, creates mixed pairs within each colour, then draws Red mixed pairs against Blue. Captain mixed pairs lead the draw.",
    },
    {
      title: "Pairs Knockout",
      icon: Users,
      description:
        "Creates random pairs and a knockout bracket. Pair seeding uses combined Handicap Index, with an optional defending pair retained as Seed 1.",
    },
    {
      title: "Existing Start List",
      icon: ListOrdered,
      description:
        "Uses tee times and groups already imported through Players, preserving that starting order rather than creating a new draw.",
    },
    {
      title: "FD1",
      icon: Construction,
      description: "Reserved for a future Field Management development.",
      muted: true,
    },
    {
      title: "FD2",
      icon: Construction,
      description: "Reserved for a future Field Management development.",
      muted: true,
    },
  ];

  const menuOverviewSheet = showMenuOverview ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Field Management Menu Overview"
      onClick={() => setShowMenuOverview(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(15, 23, 42, 0.48)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(1080px, 96vw)",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: "18px",
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)",
          border: "1px solid #dbe5f1",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            padding: "1.25rem 1.5rem 1rem",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: "#1f5fbf" }}>
              Field Management — Menu Overview
            </h2>
            <p
              style={{
                margin: "0.35rem 0 0",
                color: "#64748b",
                lineHeight: 1.45,
              }}
            >
              A quick guide to each Field Management option and what it does.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMenuOverview(false)}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#334155",
              fontWeight: 700,
              padding: "0.55rem 0.9rem",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            gap: "0.9rem",
            padding: "1.25rem 1.5rem 1.5rem",
          }}
        >
          {menuOverviewItems.map(
            ({ title, icon: Icon, description, muted }) => (
              <div
                key={title}
                style={{
                  display: "grid",
                  gridTemplateColumns: "112px 1fr",
                  gap: "1rem",
                  alignItems: "center",
                  padding: "0.9rem",
                  border: "1px solid #dbe5f1",
                  borderRadius: "14px",
                  background: muted ? "#f3f4f6" : "#ffffff",
                  opacity: muted ? 0.68 : 1,
                }}
              >
                <div
                  style={{
                    minHeight: "92px",
                    border: "2px solid #cfe0f5",
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.45rem",
                    background: muted ? "#e5e7eb" : "#f8fbff",
                    color: muted ? "#8b95a5" : "#1f5fbf",
                    textAlign: "center",
                    padding: "0.55rem",
                    boxSizing: "border-box",
                  }}
                >
                  <Icon size={26} />
                  <strong style={{ fontSize: "0.88rem", lineHeight: 1.15 }}>
                    {title}
                  </strong>
                </div>
                <p
                  style={{
                    margin: 0,
                    color: muted ? "#7c8797" : "#475569",
                    lineHeight: 1.5,
                    fontSize: "0.92rem",
                  }}
                >
                  {description}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  ) : null;

  const existingStartListAction =
    existingStartList.length > 0 ? (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.65rem",
          minHeight: "82px",
          padding: "0.75rem 1rem",
          border: "2px solid #6ea4e8",
          borderRadius: "12px",
          background: isUsingExistingStartList ? "#edf5ff" : "#f7f9fc",
          color: "#1f5fbf",
          boxSizing: "border-box",
        }}
      >
        <ListOrdered size={22} />
        <div style={{ textAlign: "left" }}>
          <strong style={{ display: "block" }}>
            Existing Start List
          </strong>
          <span style={{ fontSize: "0.85rem", color: "#5f6b7a" }}>
            {existingStartList.length} players from Players
          </span>
        </div>
      </div>
    ) : null;

  const conductTitle =
    selectedMethod === "mixedClashPairs"
      ? mixedClashStage === "lineups"
        ? "Confirm Mixed Line-ups"
        : mixedClashStage === "pairs"
        ? "Draw Red v Blue Matches"
        : "Draw Confirmed"
      : selectedMethod === "clashPairs"
      ? clashStage === "lineups"
        ? "Confirm Team Line-ups"
        : clashStage === "pairs"
        ? "Draw Red v Blue Matches"
        : "Confirm Draw"
      : selectedMethod === "doublePairs"
      ? doublePairsStage === "pairs"
        ? "Draw the Matches"
        : "Confirm Draw"
      : (
          selectedMethod === "gross" &&
          grossStage === "scores"
        ) ||
        (
          selectedMethod === "nett" &&
          nettStage === "scores"
        )
      ? "Confirm Round 1"
      : "Conduct / Confirm";

  function buildDrawPreview(): DrawPreviewData {
    const selectedTitle =
      drawMethods.find(
        (method) =>
          method.key === selectedMethod
      )?.title ?? "Draw";

    const subtitleParts = [
      event.eventDate
        ? `Date: ${event.eventDate}`
        : "",
      event.venue
        ? `Venue: ${event.venue}`
        : "",
      event.competition
        ? `Competition: ${event.competition}`
        : "",
    ].filter(Boolean);

    if (isUsingExistingStartList) {
      return {
        title: "Existing Start List",
        subtitle:
          subtitleParts.length > 0
            ? subtitleParts.join(" • ")
            : "Existing start list from Players",
        rows: existingStartList.map((row) => ({
          group: row.group,
          player: row.playerName,
          homeClub: row.homeClub,
          hi: row.handicapIndex === null ? "" : formatHI(row.handicapIndex),
          status: "Registered",
        })),
      };
    }

    if (selectedMethod === "mixedClashPairs") {
      const previewTeamPlayer = (player: ClashTeamPlayer, index: number) => ({
        name: `${player.firstName} ${player.lastName}`.trim(),
        hi: formatHI(player.handicapIndex),
        captain: index === 0,
      });

      return {
        title: selectedTitle,
        subtitle:
          subtitleParts.length > 0
            ? subtitleParts.join(" • ")
            : "Three-stage mixed Red v Blue team draw",
        mixedClashDraw: {
          confirmed: drawConfirmed,
          redMen: mixedClashRedMen.map(previewTeamPlayer),
          redLadies: mixedClashRedLadies.map(previewTeamPlayer),
          blueMen: mixedClashBlueMen.map(previewTeamPlayer),
          blueLadies: mixedClashBlueLadies.map(previewTeamPlayer),
          redPairs: mixedClashRedPairs.map((pair) => ({
            pairNumber: pair.pairNumber,
            man: previewTeamPlayer(pair.man, pair.containsCaptains ? 0 : 1),
            lady: previewTeamPlayer(pair.lady, pair.containsCaptains ? 0 : 1),
            captainPair: pair.containsCaptains,
          })),
          bluePairs: mixedClashBluePairs.map((pair) => ({
            pairNumber: pair.pairNumber,
            man: previewTeamPlayer(pair.man, pair.containsCaptains ? 0 : 1),
            lady: previewTeamPlayer(pair.lady, pair.containsCaptains ? 0 : 1),
            captainPair: pair.containsCaptains,
          })),
          matches: mixedClashMatches.map((match) => ({
            matchNumber: match.matchNumber,
            redPairNumber: match.redPair.pairNumber,
            redPlayers: `${match.redPair.man.firstName} ${match.redPair.man.lastName} / ${match.redPair.lady.firstName} ${match.redPair.lady.lastName}`.trim(),
            bluePairNumber: match.bluePair.pairNumber,
            bluePlayers: `${match.bluePair.man.firstName} ${match.bluePair.man.lastName} / ${match.bluePair.lady.firstName} ${match.bluePair.lady.lastName}`.trim(),
            captainMatch: Boolean(match.redPair.containsCaptains && match.bluePair.containsCaptains),
          })),
        },
      } as DrawPreviewData;
    }


    if (selectedMethod === "clashPairs") {
      const previewPlayer = (player: ClashDrawPlayer) => ({
        name: player.isReserve
          ? `Reserve ${player.lastName}`.trim()
          : `${player.firstName} ${player.lastName}`.trim(),
        hi: player.isReserve ? "—" : formatHI(player.handicapIndex),
        captain: Boolean(player.isCaptain),
        reserve: Boolean(player.isReserve),
      });

      const teamPlayer = (player: ClashTeamPlayer, index: number) => ({
        name: `${player.firstName} ${player.lastName}`.trim(),
        hi: formatHI(player.handicapIndex),
        captain: index === 0,
        reserve: false,
      });

      return {
        title: selectedTitle,
        subtitle:
          subtitleParts.length > 0
            ? subtitleParts.join(" • ")
            : "Three-stage Red v Blue team draw",
        clashDraw: {
          confirmed: drawConfirmed,
          redTeam: clashRedTeam.map(teamPlayer),
          blueTeam: clashBlueTeam.map(teamPlayer),
          redPairs: clashRedPairs.map((pair) => ({
            pairNumber: pair.pairNumber,
            player1: previewPlayer(pair.playerA),
            player2: previewPlayer(pair.playerB),
            captainPair: pair.containsCaptain,
            reservePair: Boolean(pair.playerA.isReserve || pair.playerB.isReserve),
          })),
          bluePairs: clashBluePairs.map((pair) => ({
            pairNumber: pair.pairNumber,
            player1: previewPlayer(pair.playerA),
            player2: previewPlayer(pair.playerB),
            captainPair: pair.containsCaptain,
            reservePair: Boolean(pair.playerA.isReserve || pair.playerB.isReserve),
          })),
          matches: clashMatches.map((match) => ({
            matchNumber: match.matchNumber,
            redPairNumber: match.redPair.pairNumber,
            redPlayers: `${match.redPair.playerA.firstName} ${match.redPair.playerA.lastName} / ${match.redPair.playerB.firstName} ${match.redPair.playerB.lastName}`.trim(),
            bluePairNumber: match.bluePair.pairNumber,
            bluePlayers: `${match.bluePair.playerA.firstName} ${match.bluePair.playerA.lastName} / ${match.bluePair.playerB.firstName} ${match.bluePair.playerB.lastName}`.trim(),
            captainMatch: Boolean(match.redPair.containsCaptain && match.bluePair.containsCaptain),
            reserveMatch: Boolean(
              match.redPair.playerA.isReserve ||
              match.redPair.playerB.isReserve ||
              match.bluePair.playerA.isReserve ||
              match.bluePair.playerB.isReserve
            ),
          })),
        },
      } as DrawPreviewData;
    }

    if (selectedMethod === "doublePairs") {
      return {
        title: selectedTitle,
        subtitle:
          subtitleParts.length > 0
            ? subtitleParts.join(" • ")
            : "Progressive two-stage random pairs draw",
        doubleDraw: {
          confirmed: drawConfirmed,
          pairs: doubleDrawPairs.map((pair) => ({
            pairNumber: pair.pairNumber,
            player1: pair.playerA.id.startsWith("pending-ghost-")
              ? "Pending Ghost"
              : `${pair.playerA.firstName} ${pair.playerA.lastName}`.trim(),
            hi1: pair.playerA.id.startsWith("pending-ghost-")
              ? "—"
              : formatHI(pair.playerA.handicapIndex),
            player2: pair.playerB.id.startsWith("pending-ghost-")
              ? "Pending Ghost"
              : `${pair.playerB.firstName} ${pair.playerB.lastName}`.trim(),
            hi2: pair.playerB.id.startsWith("pending-ghost-")
              ? "—"
              : formatHI(pair.playerB.handicapIndex),
          })),
          matches: doubleDrawMatches.map((match) => ({
            matchNumber: match.matchNumber,
            pairANumber: match.pairA.pairNumber,
            pairAPlayers: `${match.pairA.playerA.firstName} ${match.pairA.playerA.lastName} / ${match.pairA.playerB.firstName} ${match.pairA.playerB.lastName}`,
            pairBNumber: match.pairB?.pairNumber,
            pairBPlayers: match.pairB
              ? `${match.pairB.playerA.firstName} ${match.pairB.playerA.lastName} / ${match.pairB.playerB.firstName} ${match.pairB.playerB.lastName}`
              : "BYE",
          })),
        },
      } as DrawPreviewData;
    }

    if (
      (
        selectedMethod === "singles" ||
        selectedMethod === "pairs"
      ) &&
      knockoutBracket
    ) {
      const matches =
        knockoutBracket.matches.map(
          (match) => ({
            round:
              knockoutRoundName(
                match.round,
                knockoutBracket.rounds
              ),
            match:
              `Match ${match.matchNumber}`,
            playerA:
              match.slotA.playerName ??
              "Blank",
            playerB:
              match.slotB.playerName ??
              "Blank",
          })
        );

      return {
        title: selectedTitle,
        subtitle:
          subtitleParts.length > 0
            ? subtitleParts.join(" • ")
            : "Knockout draw",
        matches,
      };
    }

    const sourceRows =
      proposedDraw.length > 0
        ? proposedDraw
        : confirmedDraw;

    const rows =
      sourceRows.map((player) => ({
        group:
          player.groupNumber.toString(),
        player:
          player.id.startsWith("pending-ghost-")
            ? "Pending Ghost"
            : `${player.firstName} ${player.lastName}`.trim(),
        homeClub:
          player.homeClub?.trim() ?? "",
        hi:
          player.id.startsWith("pending-ghost-")
            ? "—"
            : formatHI(
                player.handicapIndex
              ),
        score:
          selectedMethod === "gross" &&
          grossStage === "round2"
            ? getRoundOneGross(
                player.id
              )
            : selectedMethod === "nett" &&
              nettStage === "round2"
            ? getNettScore(
                player.id
              )
            : undefined,
        status:
          drawConfirmed
            ? "Confirmed"
            : "Proposed",
      }));

    return {
      title:
        selectedTitle,
      subtitle:
        subtitleParts.length > 0
          ? subtitleParts.join(" • ")
          : "Field draw",
      rows,
    };
  }

  const controls = (
    <div
      className="page-actions"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 136px)",
        justifyContent: "center",
        gap: "0.75rem",
        marginTop: "0.25rem",
      }}
    >
      <div />
      <ActionTile
        icon={CheckCircle}
        title={conductTitle}
        primary={
          !drawConfirmed &&
          (
            (selectedMethod === "mixedClashPairs" &&
              (
                (mixedClashStage === "lineups" &&
                  mixedClashRedMen.length > 0 &&
                  mixedClashRedLadies.length > 0 &&
                  mixedClashBlueMen.length > 0 &&
                  mixedClashBlueLadies.length > 0) ||
                (mixedClashStage === "pairs" &&
                  mixedClashRedPairs.length > 0 &&
                  mixedClashBluePairs.length > 0)
              )) ||
            (selectedMethod === "clashPairs" && clashRedTeam.length > 0 && clashBlueTeam.length > 0) ||
            proposedDraw.length > 0 ||
            (selectedMethod === "doublePairs" && doubleDrawPairs.length > 0) ||
            (
              selectedMethod === "gross" &&
              grossStage === "scores"
            ) ||
            (
              (
                selectedMethod === "singles" ||
                selectedMethod === "pairs"
              ) &&
              (
                knockoutBracket !== null ||
                selectedMethod === "pairs"
              )
            )
          )
        }
        onClick={conductConfirm}
        disabled={
          !selectedMethod ||
          drawConfirmed ||
          (selectedMethod === "mixedClashPairs" &&
            (
              mixedClashStage === "matches" ||
              (mixedClashStage === "lineups" &&
                (
                  mixedClashRedMen.length === 0 ||
                  mixedClashRedLadies.length === 0 ||
                  mixedClashBlueMen.length === 0 ||
                  mixedClashBlueLadies.length === 0
                )) ||
              (mixedClashStage === "pairs" &&
                (mixedClashRedPairs.length === 0 || mixedClashBluePairs.length === 0))
            )) ||
          (selectedMethod === "clashPairs" && (clashRedTeam.length === 0 || clashBlueTeam.length === 0)) ||
          (
            selectedMethod === "gross" &&
            grossStage === "round2" &&
            proposedDraw.length === 0
          ) ||
          (
            selectedMethod === "nett" &&
            nettStage === "round2" &&
            proposedDraw.length === 0
          ) ||
          (
            selectedMethod === "singles" &&
            knockoutBracket === null
          )
        }
      />

      {selectedMethod === "doublePairs" &&
        doublePairsStage === "pairs" &&
        !drawConfirmed && (
          <ActionTile
            icon={RotateCcw}
            title="Redraw Pairs"
            onClick={() => {
              const pairs = createDoubleDrawPairs(registeredPlayers);
              setDoubleDrawPairs(pairs);
              setDoubleDrawMatches([]);
              persistState({
                selectedMethod: "doublePairs",
                doublePairsStage: "pairs",
                doubleDrawPairs: pairs,
                doubleDrawMatches: [],
                drawConfirmed: false,
              });
            }}
          />
        )}

      <ActionTile
        icon={RotateCcw}
        title="Reset"
        onClick={resetDraw}
      />

      <ActionTile
        icon={Printer}
        title="Export / Print"
        disabled={
          (selectedMethod === "clashPairs"
            ? !drawConfirmed || clashMatches.length === 0
            : selectedMethod === "mixedClashPairs"
            ? !drawConfirmed || mixedClashMatches.length === 0
            : (!isUsingExistingStartList &&
              proposedDraw.length === 0 &&
              confirmedDraw.length === 0 &&
              knockoutBracket === null &&
              doubleDrawPairs.length === 0))
        }
        onClick={() =>
          onExportPrint(
            buildDrawPreview()
          )
        }
      />

    </div>
  );

  const nettScoreEntryTable = (
    <>
      <thead>
        <tr>
          <th>Player</th>
          <th>HI</th>
          <th>Round 1 Gross</th>
          <th>Playing Handicap</th>
        </tr>
      </thead>

      <tbody>
        {registeredPlayers.map(
          (player) => {
            const entry =
              nettScores.find(
                (item) =>
                  item.playerId ===
                  player.id
              );

            return (
              <tr
                key={player.id}
              >
                <td>
                  {player.firstName}{" "}
                  {player.lastName}
                </td>

                <td>
                  {formatHI(
                    player.handicapIndex
                  )}
                </td>

                <td>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      entry?.gross ??
                      ""
                    }
                    onChange={(event) =>
                      updateNettScore(
                        player.id,
                        "gross",
                        event.target.value
                      )
                    }
                    style={{
                      width: "90px",
                      padding: "8px 10px",
                      border:
                        "1px solid #dbe6f3",
                      borderRadius: "8px",
                    }}
                  />
                </td>

                <td>
                  <input
                    type="number"
                    step="1"
                    value={
                      entry?.playingHandicap ??
                      ""
                    }
                    onChange={(event) =>
                      updateNettScore(
                        player.id,
                        "playingHandicap",
                        event.target.value
                      )
                    }
                    style={{
                      width: "110px",
                      padding: "8px 10px",
                      border:
                        "1px solid #dbe6f3",
                      borderRadius: "8px",
                    }}
                  />
                </td>
              </tr>
            );
          }
        )}
      </tbody>
    </>
  );

  const knockoutCompact =
    knockoutBracket !== null &&
    knockoutBracket.entrants > 50;

  const knockoutBracketTable =
    knockoutBracket &&
    (
      selectedMethod === "singles" ||
      selectedMethod === "pairs"
    )
      ? (
        <div
          style={{
            width: "100%",
            overflowX: "auto",
            padding: "0.75rem 0.5rem 1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: knockoutCompact ? "0.7rem" : "1.1rem",
              minWidth: "900px",
            }}
          >
            {Array.from(
              {
                length:
                  knockoutBracket.rounds,
              },
              (_, roundIndex) => {
                const round =
                  roundIndex + 1;

                const roundMatches =
                  knockoutBracket.matches.filter(
                    (match) =>
                      match.round === round
                  );

                /*
                 * Each match box is the same height.
                 * The first match in every later round is
                 * offset by half the distance of the previous
                 * round, producing true progressive centering.
                 */
                /*
                 * Keep the full knockout tree practical on the
                 * available page area. A field over 50 entrants
                 * needs smaller boxes/text so the complete bracket
                 * remains usable without making the organiser scroll
                 * excessively vertically.
                 */
                const compact = knockoutCompact;

                const boxHeight = compact ? 64 : 82;
                const gap = compact ? 8 : 14;
                const previousStep =
                  boxHeight + gap;

                const topOffset =
                  round === 1
                    ? 0
                    : (
                        previousStep *
                        (Math.pow(2, round - 1) - 1)
                      ) / 2;

                return (
                  <div
                    key={round}
                    style={{
                      width: compact ? "190px" : "220px",
                      minWidth: compact ? "190px" : "220px",
                    }}
                  >
                    <div
                      style={{
                        height: compact ? "26px" : "30px",
                        fontWeight: 700,
                        fontSize: compact ? "0.82rem" : undefined,
                        color: "#1f5fbf",
                        textAlign: "center",
                        marginBottom: compact ? "0.4rem" : "0.55rem",
                      }}
                    >
                      {
                        knockoutRoundName(
                          round,
                          knockoutBracket.rounds
                        )
                      }
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap:
                          round === 1
                            ? `${gap}px`
                            : `${previousStep * Math.pow(2, round - 1) - boxHeight}px`,
                        paddingTop:
                          `${topOffset}px`,
                      }}
                    >
                      {roundMatches.map(
                        (match) => (
                          <div
                            key={`${round}-${match.matchNumber}`}
                            style={{
                              height: `${boxHeight}px`,
                              border:
                                "1px solid #dbe6f3",
                              borderRadius: "9px",
                              background: "#ffffff",
                              padding: "0.45rem 0.6rem",
                              boxSizing: "border-box",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize:
                                  compact ? "0.64rem" : "0.72rem",
                                color:
                                  "#6b7280",
                                marginBottom:
                                  "0.25rem",
                              }}
                            >
                              Match{" "}
                              {
                                match.matchNumber
                              }
                            </div>

                            <div
                              style={{
                                minHeight:
                                  "1.45rem",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                borderBottom:
                                  "1px solid #eef2f7",
                                fontSize:
                                  compact ? "0.76rem" : "0.88rem",
                              }}
                            >
                              {round === 1
                                ? knockoutStatus(
                                    match.slotA
                                  )
                                : ""}
                            </div>

                            <div
                              style={{
                                minHeight:
                                  "1.45rem",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                fontSize:
                                  compact ? "0.76rem" : "0.88rem",
                              }}
                            >
                              {round === 1
                                ? knockoutStatus(
                                    match.slotB
                                  )
                                : ""}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )
      : null;

  const scoreEntryTable = (
    <>
      <thead>
        <tr>
          <th>Player</th>
          <th>HI</th>
          <th>Round 1 Gross</th>
        </tr>
      </thead>

      <tbody>
        {registeredPlayers.map(
          (player) => {
            const entry =
              grossScores.find(
                (item) =>
                  item.playerId ===
                  player.id
              );

            return (
              <tr
                key={player.id}
              >
                <td>
                  {player.firstName}{" "}
                  {player.lastName}
                </td>

                <td>
                  {formatHI(
                    player.handicapIndex
                  )}
                </td>

                <td>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      entry?.gross ??
                      ""
                    }
                    onChange={(event) =>
                      updateGrossScore(
                        player.id,
                        event.target.value
                      )
                    }
                    style={{
                      width:
                        "90px",
                      padding:
                        "8px 10px",
                      border:
                        "1px solid #dbe6f3",
                      borderRadius:
                        "8px",
                    }}
                  />
                </td>
              </tr>
            );
          }
        )}
      </tbody>
    </>
  );

  const showingGrossRoundTwo =
    selectedMethod === "gross" &&
    grossStage === "round2" &&
    proposedDraw.length > 0;

  const showingNettRoundTwo =
    selectedMethod === "nett" &&
    nettStage === "round2" &&
    proposedDraw.length > 0;

  function getNettScore(playerId: string): string {
    const entry = nettScores.find(
      (item) => item.playerId === playerId
    );

    if (!entry) return "";

    const gross = Number(entry.gross);
    const handicap = Number(
      entry.playingHandicap
    );

    if (
      !Number.isFinite(gross) ||
      !Number.isFinite(handicap)
    ) {
      return "";
    }

    return (
      gross - handicap
    ).toFixed(1);
  }

  const mixedClashTeamSetup = (
    <div style={{ width: "100%", padding: "1rem" }}>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, color: "#1f5fbf" }}>
          Mixed Clash Pairs — {mixedClashStage === "lineups" ? "Team Line-ups" : mixedClashStage === "pairs" ? "Mixed Pairs Draw" : "Red v Blue Match Draw"}
        </h3>
        <p style={{ margin: "0.4rem 0 0", color: "#6b7280", lineHeight: 1.5 }}>
          {mixedClashStage === "lineups"
            ? "Import four Captain-selected lists: Red Men, Red Ladies, Blue Men and Blue Ladies. The first player in each list is that section Captain."
            : mixedClashStage === "pairs"
            ? "The two Red Captains form Red Pair 1 and the two Blue Captains form Blue Pair 1. All remaining Men and Ladies have been randomly paired within their own team colour."
            : "The two Captains Pairs are fixed together in Match 1 / first tee group. All remaining Red and Blue mixed pairs have been randomly drawn against each other."}
        </p>
      </div>

      {mixedClashStage === "lineups" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem", alignItems: "start" }}>
            {[
              { key: "redMen" as const, title: "RED MEN", team: mixedClashRedMen, accent: "#b3261e", background: "#fff4f3" },
              { key: "redLadies" as const, title: "RED LADIES", team: mixedClashRedLadies, accent: "#b3261e", background: "#fff4f3" },
              { key: "blueMen" as const, title: "BLUE MEN", team: mixedClashBlueMen, accent: "#1f5fbf", background: "#f2f7ff" },
              { key: "blueLadies" as const, title: "BLUE LADIES", team: mixedClashBlueLadies, accent: "#1f5fbf", background: "#f2f7ff" },
            ].map((section) => (
              <section key={section.key} style={{ border: `2px solid ${section.accent}`, borderRadius: "12px", overflow: "hidden", background: "#ffffff" }}>
                <div style={{ padding: "0.9rem 1rem", background: section.background, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                  <div>
                    <strong style={{ color: section.accent, fontSize: "1rem" }}>{section.title}</strong>
                    <div style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                      {section.team.length} player{section.team.length === 1 ? "" : "s"} imported
                    </div>
                  </div>
                  <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "38px", padding: "0.45rem 0.8rem", borderRadius: "8px", background: section.accent, color: "white", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    Import CSV
                    <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(event) => { const file = event.target.files?.[0]; void importMixedClashTeam(file, section.key); event.currentTarget.value = ""; }} />
                  </label>
                </div>
                {section.team.length === 0 ? (
                  <div style={{ padding: "1.25rem", textAlign: "center", color: "#6b7280" }}>No {section.title.toLowerCase()} CSV imported yet.</div>
                ) : (
                  <table>
                    <thead><tr><th>No.</th><th>Player</th><th>HI</th></tr></thead>
                    <tbody>
                      {section.team.map((player, index) => (
                        <tr key={player.id}>
                          <td>{index + 1}</td>
                          <td><strong>{player.firstName} {player.lastName}</strong>{index === 0 ? <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", fontWeight: 800, color: section.accent }}>CAPTAIN</span> : null}</td>
                          <td>{formatHI(player.handicapIndex)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            ))}
          </div>

          <div style={{ marginTop: "1rem", padding: "0.8rem 1rem", borderRadius: "10px", background: "#f7f9fc", color: "#5f6b7a", fontSize: "0.9rem", lineHeight: 1.5 }}>
            CSV headings accepted are <strong>First Name, Last Name, HI</strong> or <strong>Player Name, HI</strong>. The first imported player in each list is the section Captain.
          </div>
        </>
      ) : mixedClashStage === "pairs" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "1rem", alignItems: "start" }}>
          {([
            { title: "RED MIXED PAIRS", pairs: mixedClashRedPairs, accent: "#b3261e" },
            { title: "BLUE MIXED PAIRS", pairs: mixedClashBluePairs, accent: "#1f5fbf" },
          ]).map((section) => (
            <section key={section.title} style={{ border: `2px solid ${section.accent}`, borderRadius: "12px", overflow: "hidden", background: "#ffffff" }}>
              <div style={{ padding: "0.9rem 1rem", background: section.accent === "#b3261e" ? "#fff4f3" : "#f2f7ff" }}>
                <strong style={{ color: section.accent, fontSize: "1rem" }}>{section.title}</strong>
              </div>
              <table>
                <thead><tr><th>Pair</th><th>Man</th><th>Lady</th></tr></thead>
                <tbody>
                  {section.pairs.map((pair) => (
                    <tr key={pair.id}>
                      <td>
                        <strong>{pair.pairNumber}</strong>
                        {pair.containsCaptains ? (
                          <div style={{ marginTop: "0.2rem", fontSize: "0.72rem", fontWeight: 800, color: section.accent }}>
                            CAPTAINS PAIR
                          </div>
                        ) : null}
                      </td>
                      <td>{pair.man.firstName} {pair.man.lastName}{pair.containsCaptains ? " (Captain)" : ""}</td>
                      <td>{pair.lady.firstName} {pair.lady.lastName}{pair.containsCaptains ? " (Captain)" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      ) : (
        <section style={{ border: "2px solid #5b9df0", borderRadius: "12px", overflow: "hidden", background: "#ffffff" }}>
          <table>
            <thead>
              <tr>
                <th>Match</th>
                <th>RED MIXED PAIR</th>
                <th>BLUE MIXED PAIR</th>
              </tr>
            </thead>
            <tbody>
              {mixedClashMatches.map((match) => (
                <tr key={`mixed-match-${match.matchNumber}`}>
                  <td>
                    <strong>{match.matchNumber}</strong>
                    {match.matchNumber === 1 ? (
                      <div style={{ marginTop: "0.2rem", color: "#1f5fbf", fontSize: "0.72rem", fontWeight: 800 }}>
                        CAPTAINS — FIRST TEE GROUP
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <strong>Pair {match.redPair.pairNumber}</strong>
                    <div>{match.redPair.man.firstName} {match.redPair.man.lastName} / {match.redPair.lady.firstName} {match.redPair.lady.lastName}</div>
                  </td>
                  <td>
                    <strong>Pair {match.bluePair.pairNumber}</strong>
                    <div>{match.bluePair.man.firstName} {match.bluePair.man.lastName} / {match.bluePair.lady.firstName} {match.bluePair.lady.lastName}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );

  const clashTeamSetup = (
    <div style={{ width: "100%", padding: "1rem" }}>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, color: "#1f5fbf" }}>
          Clash Pairs — {clashStage === "lineups" ? "Team Line-ups" : clashStage === "pairs" ? "Team Pairs Draw" : "Red v Blue Match Draw"}
        </h3>
        <p style={{ margin: "0.4rem 0 0", color: "#6b7280", lineHeight: 1.5 }}>
          {clashStage === "lineups"
            ? "Import the Captain-selected Red and Blue team CSV files. The first player in each list is the Team Captain."
            : clashStage === "pairs"
            ? "Players have been randomly paired within their own team. Reserve slots remain available for late entries."
            : "Captain-containing pairs are fixed in Match 1. All remaining Red v Blue matches are randomly drawn."}
        </p>
      </div>

      {clashStage === "lineups" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem", alignItems: "start" }}>
            {([
              { key: "red" as const, title: "RED TEAM", team: clashRedTeam, accent: "#b3261e", background: "#fff4f3" },
              { key: "blue" as const, title: "BLUE TEAM", team: clashBlueTeam, accent: "#1f5fbf", background: "#f2f7ff" },
            ]).map((section) => (
              <section key={section.key} style={{ border: `2px solid ${section.accent}`, borderRadius: "12px", overflow: "hidden", background: "#ffffff" }}>
                <div style={{ padding: "0.9rem 1rem", background: section.background, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                  <div>
                    <strong style={{ color: section.accent, fontSize: "1rem" }}>{section.title}</strong>
                    <div style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                      {section.team.length} player{section.team.length === 1 ? "" : "s"} imported
                    </div>
                  </div>
                  <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "38px", padding: "0.45rem 0.8rem", borderRadius: "8px", background: section.accent, color: "white", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    Import CSV
                    <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(event) => { const file = event.target.files?.[0]; void importClashTeam(file, section.key); event.currentTarget.value = ""; }} />
                  </label>
                </div>
                {section.team.length === 0 ? (
                  <div style={{ padding: "1.25rem", textAlign: "center", color: "#6b7280" }}>No {section.key} team CSV imported yet.</div>
                ) : (
                  <table>
                    <thead><tr><th>No.</th><th>Player</th><th>HI</th></tr></thead>
                    <tbody>
                      {section.team.map((player, index) => (
                        <tr key={player.id}>
                          <td>{index + 1}</td>
                          <td><strong>{player.firstName} {player.lastName}</strong>{index === 0 ? <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", fontWeight: 800, color: section.accent }}>CAPTAIN</span> : null}</td>
                          <td>{formatHI(player.handicapIndex)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            ))}
          </div>
          <div style={{ marginTop: "1rem", padding: "0.8rem 1rem", borderRadius: "10px", background: "#f7f9fc", color: "#5f6b7a", fontSize: "0.9rem", lineHeight: 1.5 }}>
            CSV headings accepted: <strong>First Name, Last Name, HI</strong> or <strong>Player Name, HI</strong>. Maximum 20 players per team. The first imported player is treated as Captain.
          </div>
        </>
      ) : clashStage === "pairs" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1rem" }}>
          {([
            { title: "RED TEAM PAIRS", pairs: clashRedPairs, accent: "#b3261e" },
            { title: "BLUE TEAM PAIRS", pairs: clashBluePairs, accent: "#1f5fbf" },
          ]).map((section) => (
            <section key={section.title} style={{ border: `2px solid ${section.accent}`, borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "0.8rem 1rem", fontWeight: 800, color: section.accent }}>{section.title}</div>
              <table><thead><tr><th>Pair</th><th>Player 1</th><th>Player 2</th></tr></thead><tbody>
                {section.pairs.map((pair) => (
                  <tr key={pair.id}>
                    <td><strong>{pair.pairNumber}</strong>{pair.containsCaptain ? <div style={{ fontSize: "0.7rem", fontWeight: 800, color: section.accent }}>CAPTAIN PAIR</div> : null}</td>
                    <td>{pair.playerA.firstName} {pair.playerA.lastName}{pair.playerA.isCaptain ? " (Captain)" : ""}</td>
                    <td>{pair.playerB.firstName} {pair.playerB.lastName}{pair.playerB.isCaptain ? " (Captain)" : ""}</td>
                  </tr>
                ))}
              </tbody></table>
            </section>
          ))}
        </div>
      ) : (
        <section style={{ border: "2px solid #6ea4e8", borderRadius: "12px", overflow: "hidden" }}>
          <table><thead><tr><th>Match</th><th>RED PAIR</th><th>BLUE PAIR</th></tr></thead><tbody>
            {clashMatches.map((match) => (
              <tr key={match.matchNumber}>
                <td><strong>{match.matchNumber}</strong>{match.matchNumber === 1 ? <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#1f5fbf" }}>CAPTAINS — FIRST TEE GROUP</div> : null}</td>
                <td>{match.redPair.playerA.firstName} {match.redPair.playerA.lastName} / {match.redPair.playerB.firstName} {match.redPair.playerB.lastName}</td>
                <td>{match.bluePair.playerA.firstName} {match.bluePair.playerA.lastName} / {match.bluePair.playerB.firstName} {match.bluePair.playerB.lastName}</td>
              </tr>
            ))}
          </tbody></table>
        </section>
      )}
    </div>
  );

  const doubleDrawPairsTable = (
    <div style={{ width: "100%" }}>
      <div style={{ padding: "1rem 1rem 0.6rem" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <strong style={{ color: doublePairsStage === "pairs" ? "#1f5fbf" : "#6b7280" }}>① DRAW THE PAIRS</strong>
          <span>→</span>
          <strong style={{ color: doublePairsStage === "matches" ? "#1f5fbf" : "#6b7280" }}>② DRAW THE MATCHES</strong>
          <span>→</span>
          <strong style={{ color: drawConfirmed ? "#1f5fbf" : "#6b7280" }}>✓ DRAW COMPLETE</strong>
        </div>
        <p style={{ textAlign: "center", color: "#6b7280", marginBottom: 0 }}>
          {doublePairsStage === "pairs"
            ? "Step 1 complete. Review the random partnerships, redraw them if required, then draw the matches."
            : drawConfirmed
            ? "The partnerships and Pair v Pair matches are confirmed."
            : "Step 2 complete. The partnerships are locked and the pairs have been randomly matched against each other."}
        </p>
      </div>

      {doublePairsStage === "pairs" ? (
        <table>
          <thead><tr><th>Pair</th><th>Player 1</th><th>HI</th><th>Player 2</th><th>HI</th><th>Status</th></tr></thead>
          <tbody>
            {doubleDrawPairs.map((pair) => (
              <tr key={pair.id}>
                <td><strong>Pair {pair.pairNumber}</strong></td>
                <td>{pair.playerA.firstName} {pair.playerA.lastName}</td>
                <td>{formatHI(pair.playerA.handicapIndex)}</td>
                <td>{pair.playerB.id.startsWith("pending-ghost-") ? <strong style={{ color: "#c62828" }}>Pending Ghost</strong> : `${pair.playerB.firstName} ${pair.playerB.lastName}`}</td>
                <td>{pair.playerB.id.startsWith("pending-ghost-") ? "—" : formatHI(pair.playerB.handicapIndex)}</td>
                <td>Pair Drawn</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table>
          <thead><tr><th>Match</th><th>Pair</th><th>Players</th><th>v</th><th>Pair</th><th>Players</th><th>Status</th></tr></thead>
          <tbody>
            {doubleDrawMatches.map((match) => (
              <tr key={match.matchNumber}>
                <td><strong>Match {match.matchNumber}</strong></td>
                <td>Pair {match.pairA.pairNumber}</td>
                <td>{match.pairA.playerA.firstName} {match.pairA.playerA.lastName} / {match.pairA.playerB.firstName} {match.pairA.playerB.lastName}</td>
                <td><strong>v</strong></td>
                <td>{match.pairB ? `Pair ${match.pairB.pairNumber}` : "—"}</td>
                <td>{match.pairB ? `${match.pairB.playerA.firstName} ${match.pairB.playerA.lastName} / ${match.pairB.playerB.firstName} ${match.pairB.playerB.lastName}` : "BYE"}</td>
                <td>{drawConfirmed ? "Confirmed" : "Proposed"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div />
    </div>
  );

  const drawTable = (
    <>
      <thead>
        <tr>
          <th>Player</th>
          <th>HI</th>
          {(showingGrossRoundTwo ||
            showingNettRoundTwo) && (
            <th>
              {showingNettRoundTwo
                ? "Round 1 Nett"
                : "Round 1 Gross"}
            </th>
          )}
          <th>{selectedMethod === "pairDraw" ? "Pair" : "Group"}</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        {playerCount === 0 && (
          <tr>
            <td
              colSpan={
                showingGrossRoundTwo ||
                showingNettRoundTwo
                  ? 5
                  : 4
              }
              className="empty-table"
            >
              No registered players are
              available for the draw.
            </td>
          </tr>
        )}

        {playerCount > 0 &&
          selectedMethod ===
            null && (
            <tr>
              <td
                colSpan={
                  showingGrossRoundTwo ? 5 : 4
                }
                className="empty-table"
              >
                {playerCount} players ready.
                <br />
                Select a draw method to
                prepare the draw.
              </td>
            </tr>
          )}

        {playerCount > 0 &&
          selectedMethod !==
            null &&
          proposedDraw.length ===
            0 && (
            <tr>
              <td
                colSpan={
                  showingGrossRoundTwo ? 5 : 4
                }
                className="empty-table"
              >
                <strong>
                  {selectedTitle}
                </strong>{" "}
                selected.
                <br />
                This draw method is ready
                for implementation.
              </td>
            </tr>
          )}

        {proposedDraw.map(
          (player) => (
            <tr
              key={player.id}
            >
              <td>
                {player.id.startsWith("pending-ghost-") ? (
                  <strong style={{ color: "#c62828" }}>
                    Pending Ghost
                  </strong>
                ) : (
                  <>
                    {player.firstName}{" "}
                    {player.lastName}
                  </>
                )}
              </td>

              <td>
                {player.id.startsWith("pending-ghost-")
                  ? "—"
                  : formatHI(
                      player.handicapIndex
                    )}
              </td>

              {(showingGrossRoundTwo ||
                showingNettRoundTwo) && (
                <td>
                  {showingNettRoundTwo
                    ? getNettScore(player.id)
                    : getRoundOneGross(player.id)}
                </td>
              )}

              <td>
                {player.groupNumber}
              </td>

              <td>
                {drawConfirmed
                  ? "Confirmed"
                  : "Proposed"}
              </td>
            </tr>
          )
        )}
      </tbody>
    </>
  );

  return (
    <PageLayout
      title="Field Management"
      subtitle="Create and manage the playing field, draw and starting order."
      summary={summary}
      actions={
        <div
          style={{
            display:
              "flex",
            flexDirection:
              "column",
            gap:
              "0.5rem",
            width:
              "100%",
          }}
        >
          {drawOptions}
          {existingStartListAction}
          {controls}
        </div>
      }
      footer="Team draw and starting sheet management."
    >
      {menuOverviewSheet}
      <div className="players-table">
        {isUsingExistingStartList ? (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <div style={{ padding: "1rem 1rem 0.75rem" }}>
              <h3 style={{ margin: 0, color: "#1f5fbf" }}>Existing Start List</h3>
              <p style={{ margin: "0.35rem 0 0", color: "#6b7280", lineHeight: 1.5 }}>
                This starting order comes directly from the Players register. Tee times and groups were supplied by the Start List import; Event Desk has not re-drawn these players.
              </p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Tee Time</th>
                  <th>
                {selectedMethod === "pairDraw" ? "Pair" : "Group"}
              </th>
                  <th>Player</th>
                  <th>Home Club</th>
                  <th>HI</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {existingStartList.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.teeTime || "—"}</strong></td>
                    <td>{row.group}</td>
                    <td>{row.playerName}</td>
                    <td>{row.homeClub || "—"}</td>
                    <td>{row.handicapIndex === null ? "—" : formatHI(row.handicapIndex)}</td>
                    <td>Registered</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : selectedMethod === "mixedClashPairs" ? (
          mixedClashTeamSetup
        ) : selectedMethod === "clashPairs" ? (
          clashTeamSetup
        ) : selectedMethod === "doublePairs" ? (
          doubleDrawPairsTable
        ) : (
          selectedMethod === "pairs" &&
        showPairsSetup
          ? (
            <div
              style={{
                maxWidth: "760px",
                margin: "0 auto",
                padding: "1.25rem",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  color: "#1f5fbf",
                }}
              >
                Defending Pair
              </h3>

              <p
                style={{
                  marginTop: 0,
                  color: "#6b7280",
                  lineHeight: 1.5,
                }}
              >
                Select the defending pair where
                applicable. The system will randomly
                pair all other players. Leave both
                selections blank when there is no
                defending pair.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <select
                  value={pairFirstId}
                  onChange={(event) => {
                    setPairFirstId(
                      event.target.value
                    );
                    setPairSecondId("");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border:
                      "1px solid #dbe6f3",
                    borderRadius: "8px",
                    background:
                      "#ffffff",
                  }}
                >
                  <option value="">
                    No defending pair
                  </option>

                  {registeredPlayers.map(
                    (player) => (
                      <option
                        key={player.id}
                        value={player.id}
                      >
                        {player.firstName}{" "}
                        {player.lastName}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={pairSecondId}
                  onChange={(event) =>
                    setPairSecondId(
                      event.target.value
                    )
                  }
                  disabled={
                    pairFirstId === ""
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border:
                      "1px solid #dbe6f3",
                    borderRadius: "8px",
                    background:
                      "#ffffff",
                  }}
                >
                  <option value="">
                    Select partner
                  </option>

                  {registeredPlayers
                    .filter(
                      (player) =>
                        player.id !==
                        pairFirstId
                    )
                    .map(
                      (player) => (
                        <option
                          key={player.id}
                          value={player.id}
                        >
                          {player.firstName}{" "}
                          {player.lastName}
                        </option>
                      )
                    )}
                </select>
              </div>

              <div
                style={{
                  marginTop: "1rem",
                  color: "#6b7280",
                  fontSize: "0.9rem",
                }}
              >
                Click <strong>Conduct / Confirm</strong>{" "}
                to create the random pairings and the
                seeded Round 1 knockout bracket.
              </div>
            </div>
          )
          : (
            (
              selectedMethod === "singles" ||
              selectedMethod === "pairs"
            ) &&
            knockoutBracket
              ? knockoutBracketTable
              : (
                <table>
                  {selectedMethod ===
                      "gross" &&
                    grossStage ===
                      "scores"
                    ? scoreEntryTable
                    : selectedMethod ===
                        "nett" &&
                      nettStage ===
                        "scores"
                    ? nettScoreEntryTable
                    : drawTable}
                </table>
              )
          )
        )}
      </div>
    </PageLayout>
  );
}
