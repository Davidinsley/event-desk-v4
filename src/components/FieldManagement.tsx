import { useState } from "react";
import "./NewEvent.css";

import type { Player } from "../types/Player";

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
} from "lucide-react";

interface FieldManagementProps {
  players: Player[];
}

type DrawMethod =
  | "random"
  | "handicap"
  | "gross"
  | "nett"
  | "balanced"
  | "singles"
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

interface GrossScoreEntry {
  playerId: string;
  gross: string;
}

interface NettScoreEntry {
  playerId: string;
  gross: string;
  playingHandicap: string;
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
}

const STORAGE_KEY = "event-desk-field-management-draw-v4";

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
  { key: "pairs", title: "Pairs Knockout", icon: Users },
];

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
  players,
}: FieldManagementProps) {
  const registeredPlayers =
    players.filter(
      (player) =>
        player.status === "Registered"
    );

  const reserveCount =
    players.filter(
      (player) =>
        player.status === "Waiting"
    ).length;

  const playerCount =
    registeredPlayers.length;

  const playerSignature =
    registeredPlayers
      .map((player) => player.id)
      .sort()
      .join("|");

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

  const groupCount =
    getGroupSizes(
      playerCount,
      true
    ).length;

  let drawStatus =
    "Not Started";

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
          76 - playerCount
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
        display: "flex",
        flexWrap: "wrap",
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
    </div>
  );

  const conductTitle =
    (
      selectedMethod === "gross" &&
      grossStage === "scores"
    ) ||
    (
      selectedMethod === "nett" &&
      nettStage === "scores"
    )
      ? "Confirm Round 1"
      : "Conduct / Confirm";

  const controls = (
    <div
      className="page-actions"
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "0.75rem",
        marginTop: "0.25rem",
      }}
    >
      <ActionTile
        icon={CheckCircle}
        title={conductTitle}
        primary={
          !drawConfirmed &&
          (
            proposedDraw.length > 0 ||
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

      <ActionTile
        icon={RotateCcw}
        title="Reset"
        onClick={resetDraw}
      />

      <ActionTile
        icon={Printer}
        title="Export / Print"
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
          <th>Group</th>
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
                {player.firstName}{" "}
                {player.lastName}
              </td>

              <td>
                {formatHI(
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
          {controls}
        </div>
      }
      footer="Team draw and starting sheet management."
    >
      <div className="players-table">
        {selectedMethod === "pairs" &&
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
          )}
      </div>
    </PageLayout>
  );
}