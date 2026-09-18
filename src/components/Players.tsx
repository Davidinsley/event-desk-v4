// Players.tsx
// Event Desk - Players Management
// Revision: Gender capture/import + CSV + Excel + Start List merge + Home Club / Tee Time / Group preservation + Event capacity + PDF Export + reserve/payment logic

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import "./Players.css";

import PageLayout from "../layout/PageLayout";
import SummaryCard from "../ui/SummaryCard";
import ActionTile from "../ui/ActionTile";

import type { Player } from "../types/Player";

import {
  UserPlus,
  FileSpreadsheet,
  FileUp,
  Flag,
  Download,
  CirclePoundSterling,
  Trash2,
} from "lucide-react";

interface PlayersProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  playerLimit: number;
  applyHandicapCaps?: boolean;
  maleMaxHI?: number;
  femaleMaxHI?: number;
  eventName: string;
  eventDate: string;
  entryFee: number;
}

type CsvRow = Record<string, string>;

type DisplayPlayer = Player & {
  teeTime?: string;
  group?: string;
  homeClub?: string;
  club?: string;
  promotedReserve?: boolean;
  vacantStartListSlot?: boolean;
  dietaryNeed?: boolean;
  dietaryNeedType?: string;
};

export default function Players({
  players,
  setPlayers,
  playerLimit,
  applyHandicapCaps = false,
  maleMaxHI,
  femaleMaxHI,
  eventName,
  eventDate,
  entryFee,
}: PlayersProps) {
  const [showAddPlayer, setShowAddPlayer] =
    useState(false);

  // Reporting preference only. Handicap remains stored and visible in Event Desk.
  const [includeHandicapInReport, setIncludeHandicapInReport] =
    useState(true);

  const csvInputRef =
    useRef<HTMLInputElement | null>(null);

  const excelInputRef =
    useRef<HTMLInputElement | null>(null);

  const startListInputRef =
    useRef<HTMLInputElement | null>(null);

  // --------------------------------------------------
  // Form Fields
  // --------------------------------------------------

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [handicapIndex, setHandicapIndex] =
    useState("");
  const [gender, setGender] =
    useState<"" | "Male" | "Female">("");

  const [source, setSource] =
    useState<
      "Manual" | "CSV" | "Excel" | "Start List"
    >("Manual");

  const [paid, setPaid] = useState(false);
  const [dietaryNeed, setDietaryNeed] = useState(false);
  const [notes, setNotes] = useState("");

  // --------------------------------------------------
  // Handicap Cap Warnings
  // --------------------------------------------------

  function getHandicapCapWarning(
    player: Player
  ): { cap: number; message: string } | null {
    if (!applyHandicapCaps || !player.gender) {
      return null;
    }

    const cap =
      player.gender === "Female"
        ? femaleMaxHI
        : maleMaxHI;

    if (
      cap === undefined ||
      !Number.isFinite(cap) ||
      player.handicapIndex <= cap
    ) {
      return null;
    }

    return {
      cap,
      message: `HI ${player.handicapIndex.toFixed(1)} exceeds ${
        player.gender === "Female" ? "Ladies" : "Men"
      } maximum HI ${cap.toFixed(1)}`,
    };
  }

  // --------------------------------------------------
  // Clear All Players
  // --------------------------------------------------

  function clearAllPlayers() {
    if (players.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Clear all ${players.length} players from this event?\n\n` +
        "This removes the players currently entered in this event only. " +
        "It does not delete members from any master/member database.\n\n" +
        "This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setPlayers([]);
  }

  // --------------------------------------------------
  // Summary Values
  // --------------------------------------------------

  // Registration totals include everyone entered for the event.
  // The playing field is the subset currently assigned to a tee-time/group;
  // Reserves remain registered for the event but are not yet in the field.
  const playingFieldPlayers = players.filter((p) => {
    const displayPlayer = p as DisplayPlayer;
    return p.status === "Registered" && !displayPlayer.vacantStartListSlot;
  }).length;

  const registeredPlayers = players.filter((p) => {
    const displayPlayer = p as DisplayPlayer;
    return !displayPlayer.vacantStartListSlot;
  }).length;

  // Once an event contains an imported Start List, that list defines the
  // playing field. Any player added manually must therefore join the
  // Reserves until promoted into a specific vacant tee-time/group slot.
  const hasStartList = players.some((p) => {
    const displayPlayer = p as DisplayPlayer;
    return p.source === "Start List" || displayPlayer.vacantStartListSlot === true;
  });

  const reservesPlayers = players.filter((p) => {
    const displayPlayer = p as DisplayPlayer;
    return p.status === "Waiting" && !displayPlayer.vacantStartListSlot;
  }).length;

  const paidPlayers = players.filter((p) => {
    const displayPlayer = p as DisplayPlayer;
    return p.status === "Registered" && !displayPlayer.vacantStartListSlot && p.paid;
  }).length;

  const outstandingPlayers = players.filter((p) => {
    const displayPlayer = p as DisplayPlayer;
    return p.status === "Registered" && !displayPlayer.vacantStartListSlot && !p.paid;
  }).length;

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  function resetForm() {
    setFirstName("");
    setLastName("");
    setHandicapIndex("");
    setGender("");
    setSource("Manual");
    setPaid(false);
    setDietaryNeed(false);
    setNotes("");
  }

  function closeModal() {
    resetForm();
    setShowAddPlayer(false);
  }

  // --------------------------------------------------
  // CSV Helpers
  // --------------------------------------------------

  function normaliseHeader(value: string): string {
    return value
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const character = text[i];
      const nextCharacter = text[i + 1];

      if (character === '"') {
        if (
          insideQuotes &&
          nextCharacter === '"'
        ) {
          value += '"';
          i += 1;
        } else {
          insideQuotes = !insideQuotes;
        }

        continue;
      }

      if (
        character === "," &&
        !insideQuotes
      ) {
        row.push(value);
        value = "";
        continue;
      }

      if (
        (character === "\n" ||
          character === "\r") &&
        !insideQuotes
      ) {
        if (
          character === "\r" &&
          nextCharacter === "\n"
        ) {
          i += 1;
        }

        row.push(value);
        value = "";

        if (
          row.some(
            (cell) => cell.trim() !== ""
          )
        ) {
          rows.push(row);
        }

        row = [];
        continue;
      }

      value += character;
    }

    row.push(value);

    if (
      row.some(
        (cell) => cell.trim() !== ""
      )
    ) {
      rows.push(row);
    }

    return rows;
  }

  function getCsvValue(
    row: CsvRow,
    aliases: string[]
  ): string {
    for (const alias of aliases) {
      const value = row[normaliseHeader(alias)];

      if (
        value !== undefined &&
        value.trim() !== ""
      ) {
        return value.trim();
      }
    }

    return "";
  }

  // Home Club compatibility helper. Older player records may have stored
  // the value as `club` rather than `homeClub`. Always prefer the current
  // `homeClub` field, but fall back to the legacy field so existing data is
  // not lost and the Players table / Start List export can display it.
  function getPlayerHomeClub(player: Player): string {
    const displayPlayer = player as DisplayPlayer;
    return (
      displayPlayer.homeClub?.trim() ||
      displayPlayer.club?.trim() ||
      ""
    );
  }

  function parsePaidValue(value: string): boolean {
    const normalised = value
      .trim()
      .toLowerCase();

    return [
      "yes",
      "y",
      "true",
      "paid",
      "1",
    ].includes(normalised);
  }

  function parseStatus(
    value: string
  ): "Registered" | "Waiting" {
    return value
      .trim()
      .toLowerCase() === "waiting"
      ? "Waiting"
      : "Registered";
  }

  function convertPlayerRows(
    rows: string[][],
    importedSource: "CSV" | "Excel"
  ): {
    players: Player[];
    skipped: number;
  } {
    if (rows.length < 2) {
      return {
        players: [],
        skipped: 0,
      };
    }

    const headers = rows[0].map(
      normaliseHeader
    );

    const firstNameIndex = headers.findIndex(
      (header) =>
        [
          "firstname",
          "forename",
          "givenname",
        ].includes(header)
    );

    const lastNameIndex = headers.findIndex(
      (header) =>
        [
          "lastname",
          "surname",
          "familyname",
        ].includes(header)
    );

    if (
      firstNameIndex === -1 ||
      lastNameIndex === -1
    ) {
      throw new Error(
        "The CSV must contain First Name and Last Name columns."
      );
    }

    const headerRows: CsvRow[] =
      rows.slice(1).map((cells) => {
        const record: CsvRow = {};

        headers.forEach(
          (header, index) => {
            record[header] =
              cells[index] ?? "";
          }
        );

        return record;
      });

    const importedPlayers: Player[] = [];
    let skipped = 0;

    headerRows.forEach((row) => {
      const firstName =
        row[headers[firstNameIndex]]?.trim() ||
        "";

      const lastName =
        row[headers[lastNameIndex]]?.trim() ||
        "";

      if (
        firstName === "" ||
        lastName === ""
      ) {
        skipped += 1;
        return;
      }

      const handicapText =
        getCsvValue(row, [
          "Handicap Index",
          "Handicap",
          "HI",
        ]);

      const parsedHandicap =
        Number(handicapText);

      const handicapIndex =
        Number.isFinite(parsedHandicap)
          ? parsedHandicap
          : 0;

      const genderValue =
        getCsvValue(row, [
          "Gender",
          "Sex",
        ]);

      const normalisedGender = genderValue.trim().toLowerCase();
      const gender: "Male" | "Female" | undefined =
        ["female", "f", "lady", "ladies", "woman", "women"].includes(normalisedGender)
          ? "Female"
          : ["male", "m", "man", "men"].includes(normalisedGender)
          ? "Male"
          : undefined;

      const statusValue =
        getCsvValue(row, [
          "Status",
        ]);

      const paidValue =
        getCsvValue(row, [
          "Paid",
        ]);

      // Optional Start List fields. These must be carried through CSV and
      // Excel imports so an imported player register can populate the
      // Players / Start List export without creating duplicate players.
      const teeTime = getCsvValue(row, [
        "Tee Time",
        "Start Time",
        "Start",
        "Time",
      ]);

      const group = getCsvValue(row, [
        "Group",
        "Group Number",
        "Group No",
        "Fourball",
        "Fourball Number",
        "Fourball No",
      ]);

      const homeClub = getCsvValue(row, [
        "Home Club",
        "HomeClub",
        "Golf Club",
        "Home Golf Club",
        "Club",
        "Club Affiliation",
        "Home Club Name",
      ]);

      const notesValue =
        getCsvValue(row, [
          "Notes",
          "Source Notes",
        ]);

      importedPlayers.push({
        id: crypto.randomUUID(),
        firstName,
        lastName,
        handicapIndex,
        ...(gender ? { gender } : {}),
        status:
          statusValue === ""
            ? "Registered"
            : parseStatus(statusValue),
        source: importedSource,
        paid: parsePaidValue(paidValue),
        notes: notesValue,
        teeTime,
        group,
        homeClub,
      } as Player);
    });

    return {
      players: importedPlayers,
      skipped,
    };
  }

  // --------------------------------------------------
  // Import CSV
  // --------------------------------------------------

  function handleImportCsvClick() {
    csvInputRef.current?.click();
  }

  function handleCsvFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text =
          typeof reader.result === "string"
            ? reader.result
            : "";

        const rows = parseCsv(text);

        const {
          players: importedPlayers,
          skipped,
        } = convertPlayerRows(rows, "CSV");

        if (importedPlayers.length === 0) {
          alert(
            skipped > 0
              ? `No players were imported. ${skipped} row(s) were skipped because they were missing a first name or last name.`
              : "No player records were found in the CSV."
          );

          return;
        }

        // Merge imported CSV rows into existing players by first + last
        // name. This is important when the register already contains the
        // players and the CSV is being used to add Home Club / Start List
        // information. Do not create a second copy of the players.
        let updatedCount = 0;
        let addedCount = 0;
        let homeClubCount = 0;

        setPlayers((current) => {
          const next = [...current];

          importedPlayers.forEach((imported) => {
            const first = imported.firstName.trim().toLowerCase();
            const last = imported.lastName.trim().toLowerCase();

            const existingIndex = next.findIndex(
              (player) =>
                player.firstName.trim().toLowerCase() === first &&
                player.lastName.trim().toLowerCase() === last
            );

            if (existingIndex === -1) {
              const registeredCount = next.filter(
                (player) => player.status === "Registered"
              ).length;

              next.push({
                ...imported,
                status:
                  registeredCount < EVENT_CAPACITY
                    ? "Registered"
                    : "Waiting",
              } as Player);
              addedCount += 1;
              return;
            }

            const existing = next[existingIndex];
            const importedDisplay = imported as DisplayPlayer;

            if ((importedDisplay.homeClub || "").trim() !== "") {
              homeClubCount += 1;
            }

            next[existingIndex] = {
              ...existing,
              handicapIndex: imported.handicapIndex,
              ...(imported.gender ? { gender: imported.gender } : {}),
              source: "CSV",
              paid: existing.paid,
              notes:
                imported.notes.trim() !== ""
                  ? imported.notes
                  : existing.notes,
              ...(importedDisplay.teeTime !== undefined
                ? { teeTime: importedDisplay.teeTime }
                : {}),
              ...(importedDisplay.group !== undefined
                ? { group: importedDisplay.group }
                : {}),
              ...(importedDisplay.homeClub?.trim()
                ? { homeClub: importedDisplay.homeClub.trim() }
                : { homeClub: getPlayerHomeClub(existing) }),
            } as Player;

            updatedCount += 1;
          });

          return next;
        });

        if (skipped > 0) {
          alert(
            `${updatedCount} existing player(s) updated and ${addedCount} new player(s) added.\n${homeClubCount} Home Club value(s) imported.\n\n${skipped} row(s) were skipped because they were missing a first name or last name.`
          );
        } else {
          alert(
            `${updatedCount} existing player(s) updated and ${addedCount} new player(s) added.\n${homeClubCount} Home Club value(s) imported.`
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The CSV could not be imported.";

        alert(message);
      } finally {
        if (csvInputRef.current) {
          csvInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      alert(
        "The CSV file could not be read."
      );

      if (csvInputRef.current) {
        csvInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  }


  // --------------------------------------------------
  // Import Excel
  // --------------------------------------------------

  function handleImportExcelClick() {
    excelInputRef.current?.click();
  }

  function handleExcelFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        if (!(reader.result instanceof ArrayBuffer)) {
          throw new Error("The Excel file could not be read.");
        }

        const workbook = XLSX.read(reader.result, {
          type: "array",
        });

        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error(
            "The Excel workbook does not contain a worksheet."
          );
        }

        const worksheet = workbook.Sheets[firstSheetName];

        if (!worksheet) {
          throw new Error(
            "The first Excel worksheet could not be read."
          );
        }

        const rows = XLSX.utils.sheet_to_json<string[]>(
          worksheet,
          {
            header: 1,
            defval: "",
            raw: false,
          }
        );

        const {
          players: importedPlayers,
          skipped,
        } = convertPlayerRows(rows, "Excel");

        if (importedPlayers.length === 0) {
          alert(
            skipped > 0
              ? `No players were imported. ${skipped} row(s) were skipped because they were missing a first name or last name.`
              : "No player records were found in the Excel worksheet."
          );

          return;
        }

        // Merge imported CSV rows into existing players by first + last
        // name. This is important when the register already contains the
        // players and the CSV is being used to add Home Club / Start List
        // information. Do not create a second copy of the players.
        let updatedCount = 0;
        let addedCount = 0;
        let homeClubCount = 0;

        setPlayers((current) => {
          const next = [...current];

          importedPlayers.forEach((imported) => {
            const first = imported.firstName.trim().toLowerCase();
            const last = imported.lastName.trim().toLowerCase();

            const existingIndex = next.findIndex(
              (player) =>
                player.firstName.trim().toLowerCase() === first &&
                player.lastName.trim().toLowerCase() === last
            );

            if (existingIndex === -1) {
              const registeredCount = next.filter(
                (player) => player.status === "Registered"
              ).length;

              next.push({
                ...imported,
                status:
                  registeredCount < EVENT_CAPACITY
                    ? "Registered"
                    : "Waiting",
              } as Player);
              addedCount += 1;
              return;
            }

            const existing = next[existingIndex];
            const importedDisplay = imported as DisplayPlayer;

            if ((importedDisplay.homeClub || "").trim() !== "") {
              homeClubCount += 1;
            }

            next[existingIndex] = {
              ...existing,
              handicapIndex: imported.handicapIndex,
              ...(imported.gender ? { gender: imported.gender } : {}),
              source: "Excel",
              paid: existing.paid,
              notes:
                imported.notes.trim() !== ""
                  ? imported.notes
                  : existing.notes,
              ...(importedDisplay.teeTime !== undefined
                ? { teeTime: importedDisplay.teeTime }
                : {}),
              ...(importedDisplay.group !== undefined
                ? { group: importedDisplay.group }
                : {}),
              ...(importedDisplay.homeClub?.trim()
                ? { homeClub: importedDisplay.homeClub.trim() }
                : { homeClub: getPlayerHomeClub(existing) }),
            } as Player;

            updatedCount += 1;
          });

          return next;
        });

        if (skipped > 0) {
          alert(
            `${updatedCount} existing player(s) updated and ${addedCount} new player(s) added.\n${homeClubCount} Home Club value(s) imported.\n\n${skipped} row(s) were skipped because they were missing a first name or last name.`
          );
        } else {
          alert(
            `${updatedCount} existing player(s) updated and ${addedCount} new player(s) added.\n${homeClubCount} Home Club value(s) imported.`
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The Excel file could not be imported.";

        alert(message);
      } finally {
        if (excelInputRef.current) {
          excelInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      alert(
        "The Excel file could not be read."
      );

      if (excelInputRef.current) {
        excelInputRef.current.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // --------------------------------------------------
  // Import Start List
  // --------------------------------------------------

  function handleImportStartListClick() {
    const input = document.getElementById(
      "start-list-file-input"
    ) as HTMLInputElement | null;

    input?.click();
  }

  function parseStartListPlayerName(
    value: string
  ): { firstName: string; lastName: string } {
    const name = value.trim();

    if (name.includes(",")) {
      const parts = name
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length >= 2) {
        return {
          firstName: parts.slice(1).join(" "),
          lastName: parts[0],
        };
      }
    }

    const parts = name
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length < 2) {
      return {
        firstName: "",
        lastName: "",
      };
    }

    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts[parts.length - 1],
    };
  }

  function handleStartListFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        if (!(reader.result instanceof ArrayBuffer)) {
          throw new Error(
            "The Start List file could not be read."
          );
        }

        const workbook = XLSX.read(reader.result, {
          type: "array",
        });

        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error(
            "The Start List workbook does not contain a worksheet."
          );
        }

        const worksheet = workbook.Sheets[firstSheetName];

        if (!worksheet) {
          throw new Error(
            "The first Start List worksheet could not be read."
          );
        }

        const rows = XLSX.utils.sheet_to_json<string[]>(
          worksheet,
          {
            header: 1,
            defval: "",
            raw: false,
          }
        );

        if (rows.length < 2) {
          alert(
            "No player records were found in the Start List."
          );
          return;
        }

        const headers = rows[0].map(
          normaliseHeader
        );

        const playerNameIndex = headers.findIndex(
          (header) =>
            [
              "playername",
              "player",
              "name",
            ].includes(header)
        );

        if (playerNameIndex === -1) {
          throw new Error(
            "The Start List must contain a Player Name column."
          );
        }

        const teeTimeIndex = headers.findIndex(
          (header) =>
            [
              "teetime",
              "starttime",
              "start",
              "time",
            ].includes(header)
        );

        const groupIndex = headers.findIndex(
          (header) =>
            [
              "group",
              "groupnumber",
              "groupno",
              "fourball",
              "fourballnumber",
              "fourballno",
            ].includes(header)
        );

        const handicapIndex = headers.findIndex(
          (header) =>
            [
              "hcpindex",
              "handicapindex",
              "handicap",
              "hi",
            ].includes(header)
        );

        const genderIndex = headers.findIndex(
          (header) =>
            [
              "gender",
              "sex",
            ].includes(header)
        );

        const homeClubIndex = headers.findIndex(
          (header) =>
            [
              "homeclub",
              "club",
              "golfclub",
              "homegolfclub",
            ].includes(header)
        );

        const notesIndex = headers.findIndex(
          (header) =>
            ["notes", "note"].includes(header)
        );

        const importedPlayers: DisplayPlayer[] = [];
        let skipped = 0;
        let lastTeeTime = "";
        let derivedGroupNumber = 0;

        rows.slice(1).forEach((row) => {
          const playerName = String(
            row[playerNameIndex] ?? ""
          ).trim();

          if (playerName === "") {
            return;
          }

          const {
            firstName,
            lastName,
          } =
            parseStartListPlayerName(
              playerName
            );

          if (
            firstName === "" ||
            lastName === ""
          ) {
            skipped += 1;
            return;
          }

          const handicapText =
            handicapIndex === -1
              ? ""
              : String(
                  row[handicapIndex] ?? ""
                ).trim();

          const parsedHandicap =
            Number(handicapText);

          const playerHandicap =
            Number.isFinite(parsedHandicap)
              ? parsedHandicap
              : 0;

          const genderText =
            genderIndex === -1
              ? ""
              : String(row[genderIndex] ?? "").trim();

          const normalisedGender = genderText.toLowerCase();
          const playerGender: "Male" | "Female" | undefined =
            ["female", "f", "lady", "ladies", "woman", "women"].includes(normalisedGender)
              ? "Female"
              : ["male", "m", "man", "men"].includes(normalisedGender)
              ? "Male"
              : undefined;

          // Home Club is optional. A blank or missing column is valid and
          // must never cause the Start List import to fail.
          const homeClub =
            homeClubIndex === -1
              ? ""
              : String(
                  row[homeClubIndex] ?? ""
                ).trim();

          const importedNotes =
            notesIndex === -1
              ? ""
              : String(
                  row[notesIndex] ?? ""
                ).trim();

          const teeTime =
            teeTimeIndex === -1
              ? ""
              : String(
                  row[teeTimeIndex] ?? ""
                ).trim();

          let group =
            groupIndex === -1
              ? ""
              : String(
                  row[groupIndex] ?? ""
                ).trim();

          // Prefer the explicit group from the Start Sheet. If it is not
          // supplied, use tee-time changes to identify each four-ball/group.
          // If neither is present, fall back to groups of four in file order.
          if (group === "" && teeTime !== "") {
            if (teeTime !== lastTeeTime) {
              derivedGroupNumber += 1;
              lastTeeTime = teeTime;
            }
            group = String(derivedGroupNumber);
          } else if (group === "") {
            group = String(
              Math.floor(importedPlayers.length / 4) + 1
            );
          }

          importedPlayers.push({
            id: crypto.randomUUID(),
            firstName,
            lastName,
            handicapIndex:
              playerHandicap,
            ...(playerGender ? { gender: playerGender } : {}),
            status: "Registered",
            source: "Start List",
            paid: false,
            notes: importedNotes,
            teeTime,
            group,
            homeClub,
          });
        });

        if (importedPlayers.length === 0) {
          alert(
            skipped > 0
              ? `No players were imported. ${skipped} row(s) were skipped because they did not contain a complete player name.`
              : "No player records were found in the Start List."
          );
          return;
        }

        // Merge the Start List into the existing player register rather
        // than appending a second copy of every player. Matching is by
        // first name + last name, ignoring case and surrounding spaces.
        // This preserves existing registration/payment data while adding
        // the Start List fields (Tee Time, Group and Home Club).
        let updatedCount = 0;
        let addedCount = 0;

        setPlayers((current) => {
          const next = [...current];

          importedPlayers.forEach((imported) => {
            const importedFirst = imported.firstName
              .trim()
              .toLowerCase();
            const importedLast = imported.lastName
              .trim()
              .toLowerCase();

            const existingIndex = next.findIndex(
              (player) =>
                player.firstName.trim().toLowerCase() ===
                  importedFirst &&
                player.lastName.trim().toLowerCase() ===
                  importedLast
            );

            if (existingIndex === -1) {
              const registeredCount = next.filter(
                (player) => player.status === "Registered"
              ).length;

              const joinsPlayingField =
                registeredCount < EVENT_CAPACITY;

              next.push({
                ...imported,
                status: joinsPlayingField
                  ? "Registered"
                  : "Waiting",
                teeTime: joinsPlayingField
                  ? imported.teeTime
                  : "",
                group: joinsPlayingField
                  ? imported.group
                  : "",
              });

              addedCount += 1;
              return;
            }

            const existing = next[existingIndex];

            const updatedPlayer: DisplayPlayer = {
              ...existing,
              handicapIndex:
                handicapIndex === -1
                  ? existing.handicapIndex
                  : imported.handicapIndex,
              ...(imported.gender ? { gender: imported.gender } : {}),
              source: "Start List",
              notes:
                imported.notes.trim() !== ""
                  ? imported.notes
                  : existing.notes,
              teeTime: imported.teeTime,
              group: imported.group,
              homeClub:
                imported.homeClub?.trim()
                  ? imported.homeClub.trim()
                  : getPlayerHomeClub(existing),
            };

            next[existingIndex] = updatedPlayer as Player;

            updatedCount += 1;
          });

          // IMPORTANT:
          // Importing or refreshing a Start List must not promote a player
          // from the Reserves list simply because a place appears available.
          // Reserve promotion is handled only when a registered player is
          // withdrawn, so the promoted reserve can inherit that exact
          // tee time and group and retain the Promoted Reserve indicator.

          return next;
        });

        if (skipped > 0) {
          alert(
            `${updatedCount} existing player(s) updated and ${addedCount} new player(s) added from the Start List.\n\n${skipped} row(s) were skipped because they did not contain a complete player name.`
          );
        } else {
          alert(
            `${updatedCount} existing player(s) updated and ${addedCount} new player(s) added from the Start List.`
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The Start List could not be imported.";

        alert(message);
      } finally {
        if (startListInputRef.current) {
          startListInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      alert(
        "The Start List file could not be read."
      );

      if (startListInputRef.current) {
        startListInputRef.current.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // --------------------------------------------------
  // Registration / Reserves Rules
  // --------------------------------------------------
  // The event itself owns the capacity. Do not hard-code a
  // registration limit here: different events can have different
  // field sizes (for example, the Ramsdale Seniors Open has 120).
  const EVENT_CAPACITY = Math.max(0, Number(playerLimit) || 0);

  function reservePositionForPlayer(
    playerId: string
  ): number | null {
    const reserveIds = players
      .filter((player) => {
        const displayPlayer = player as DisplayPlayer;
        return player.status === "Waiting" && !displayPlayer.vacantStartListSlot;
      })
      .map((player) => player.id);

    const index = reserveIds.indexOf(playerId);

    return index === -1 ? null : index + 1;
  }

  // --------------------------------------------------
  // Add Player
  // --------------------------------------------------

  function savePlayer() {
    if (
      firstName.trim() === "" ||
      lastName.trim() === ""
    ) {
      alert(
        "Please enter both a first name and last name."
      );
      return;
    }

    if (applyHandicapCaps && gender === "") {
      alert(
        "Please select Male or Female before saving the player because handicap caps are applied to this competition."
      );
      return;
    }

    const storedVacancy = players.find((player) => {
      const displayPlayer = player as DisplayPlayer;
      return displayPlayer.vacantStartListSlot === true;
    }) as DisplayPlayer | undefined;

    // If a Reserve already exists and a Start List vacancy is waiting,
    // offer that vacancy to Reserve #1 before processing the newly entered player.
    if (hasStartList && storedVacancy) {
      const firstExistingReserve = players.find((player) => {
        const displayPlayer = player as DisplayPlayer;
        return (
          player.status === "Waiting" &&
          !displayPlayer.vacantStartListSlot
        );
      });

      if (firstExistingReserve) {
        const vacancyDetails = [
          storedVacancy.teeTime ? `Tee Time ${storedVacancy.teeTime}` : "",
          storedVacancy.group ? `Group ${storedVacancy.group}` : "",
        ]
          .filter(Boolean)
          .join(" • ");

        const reserveName =
          `${firstExistingReserve.firstName} ${firstExistingReserve.lastName}`.trim();

        const confirmed = window.confirm(
          `There is already a vacant Start List place${vacancyDetails ? `: ${vacancyDetails}` : ""}.\n\n` +
            `Reserve #1 ${reserveName} is waiting.\n\n` +
            `Promote Reserve #1 into that vacant place before adding ${firstName.trim()} ${lastName.trim()}?`
        );

        if (confirmed) {
          const reserveDisplay = firstExistingReserve as DisplayPlayer;

          setPlayers((current) => {
            const withoutVacancy = current.filter(
              (player) => player.id !== storedVacancy.id
            );

            return withoutVacancy.map((player) =>
              player.id === firstExistingReserve.id
                ? ({
                    ...player,
                    status: "Registered",
                    teeTime:
                      storedVacancy.teeTime ??
                      reserveDisplay.teeTime ??
                      "",
                    group:
                      storedVacancy.group ??
                      reserveDisplay.group ??
                      "",
                    promotedReserve: true,
                  } as Player)
                : player
            );
          });

          // Keep the Add Player form open. The newly entered player has not
          // yet been saved; clicking Save Player again will now add them as
          // the next Reserve.
          return;
        }

        // Cancel means leave Reserve #1 waiting and do not allow the newly
        // entered player to jump the queue into the same vacancy.
        return;
      }
    }

    // A vacancy created before vacancy tracking was introduced will not have
    // an internal vacancy record. Reconstruct such a vacancy from an
    // under-filled four-player Start List group so older test/live data can
    // still be repaired correctly.
    const inferredVacancy = (() => {
      if (!hasStartList || storedVacancy) return undefined;

      const grouped = new Map<
        string,
        { teeTime: string; group: string | number; count: number }
      >();

      players.forEach((player) => {
        const displayPlayer = player as DisplayPlayer;
        if (
          player.status !== "Registered" ||
          displayPlayer.vacantStartListSlot ||
          !displayPlayer.teeTime ||
          displayPlayer.group === undefined ||
          displayPlayer.group === null ||
          String(displayPlayer.group).trim() === ""
        ) {
          return;
        }

        const key = `${displayPlayer.teeTime}|${String(displayPlayer.group)}`;
        const current = grouped.get(key);

        if (current) {
          current.count += 1;
        } else {
          grouped.set(key, {
            teeTime: displayPlayer.teeTime,
            group: displayPlayer.group,
            count: 1,
          });
        }
      });

      const underFilled = Array.from(grouped.values())
        .filter((entry) => entry.count < 4)
        .sort((a, b) => {
          const timeDifference =
            teeTimeToMinutes(a.teeTime) - teeTimeToMinutes(b.teeTime);
          if (timeDifference !== 0) return timeDifference;
          return Number(a.group) - Number(b.group);
        })[0];

      if (!underFilled) return undefined;

      return {
        id: "",
        firstName: "",
        lastName: "",
        handicapIndex: 0,
        status: "Waiting",
        source: "Start List",
        paid: false,
        notes: "",
        teeTime: underFilled.teeTime,
        group: underFilled.group,
        vacantStartListSlot: true,
      } as DisplayPlayer;
    })();

    const vacancy = storedVacancy ?? inferredVacancy;

    // Older data may have a real Start List vacancy without an internal
    // vacancy record. Once that vacancy has been reconstructed, Reserve #1
    // must still have priority over the newly entered player.
    if (hasStartList && vacancy && !storedVacancy) {
      const firstExistingReserve = players.find((player) => {
        const displayPlayer = player as DisplayPlayer;
        return (
          player.status === "Waiting" &&
          !displayPlayer.vacantStartListSlot
        );
      });

      if (firstExistingReserve) {
        const vacancyDetails = [
          vacancy.teeTime ? `Tee Time ${vacancy.teeTime}` : "",
          vacancy.group ? `Group ${vacancy.group}` : "",
        ]
          .filter(Boolean)
          .join(" • ");

        const reserveName =
          `${firstExistingReserve.firstName} ${firstExistingReserve.lastName}`.trim();

        const confirmed = window.confirm(
          `There is already a vacant Start List place${vacancyDetails ? `: ${vacancyDetails}` : ""}.\n\n` +
            `Reserve #1 ${reserveName} is waiting.\n\n` +
            `Promote Reserve #1 ${reserveName} into that vacant place?`
        );

        if (confirmed) {
          const reserveDisplay = firstExistingReserve as DisplayPlayer;

          setPlayers((current) =>
            current.map((player) =>
              player.id === firstExistingReserve.id
                ? ({
                    ...player,
                    status: "Registered",
                    teeTime: vacancy.teeTime ?? reserveDisplay.teeTime ?? "",
                    group: vacancy.group ?? reserveDisplay.group ?? "",
                    promotedReserve: true,
                  } as Player)
                : player
            )
          );
        }

        // Whether promoted or cancelled, do not process the newly entered
        // player in the same click. This prevents anyone jumping Reserve #1.
        return;
      }
    }

    const shouldFillVacancy =
      hasStartList && vacancy !== undefined;

    if (shouldFillVacancy && vacancy) {
      const vacancyDetails = [
        vacancy.teeTime ? `Tee Time ${vacancy.teeTime}` : "",
        vacancy.group ? `Group ${vacancy.group}` : "",
      ]
        .filter(Boolean)
        .join(" • ");

      const confirmed = window.confirm(
        `${firstName.trim()} ${lastName.trim()} will be added to the Reserves.\n\n` +
          `There is already a vacant Start List place${vacancyDetails ? `: ${vacancyDetails}` : ""}.\n\n` +
          `Promote this player immediately into that vacant place?`
      );

      if (confirmed) {
        const promotedPlayer: Player = {
          id: crypto.randomUUID(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          handicapIndex: Number(handicapIndex) || 0,
          ...(gender ? { gender } : {}),
          status: "Registered",
          source,
          paid,
          dietaryNeed,
          notes: notes.trim(),
          teeTime: vacancy.teeTime ?? "",
          group: vacancy.group ?? "",
          promotedReserve: true,
        } as Player;

        setPlayers((current) => [
          ...current.filter(
            (player) => !vacancy.id || player.id !== vacancy.id
          ),
          promotedPlayer,
        ]);

        closeModal();
        return;
      }
    }

    const newPlayer: Player = {
      id: crypto.randomUUID(),

      firstName: firstName.trim(),
      lastName: lastName.trim(),

      handicapIndex:
        Number(handicapIndex) || 0,

      ...(gender ? { gender } : {}),

      // A Start List defines the actual playing field. Once a Start List
      // exists, every newly added player joins the Reserves unless they are
      // explicitly promoted into a preserved vacant Start List slot.
      status:
        hasStartList || registeredPlayers >= EVENT_CAPACITY
          ? "Waiting"
          : "Registered",

      source,

      paid,
      dietaryNeed,

      notes: notes.trim(),
    };

    setPlayers((current) => [
      ...current,
      newPlayer,
    ]);

    closeModal();
  }

  // --------------------------------------------------
  // Toggle Player Payment
  // --------------------------------------------------

  function togglePlayerPaid(id: string) {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id
          ? { ...player, paid: !player.paid }
          : player
      )
    );
  }

  // --------------------------------------------------
  // Toggle Dietary Need
  // --------------------------------------------------

  function toggleDietaryNeed(id: string) {
    setPlayers((current) =>
      current.map((player) => {
        if (player.id !== id) return player;

        const displayPlayer = player as DisplayPlayer;
        const nextDietaryNeed = !displayPlayer.dietaryNeed;

        return {
          ...player,
          dietaryNeed: nextDietaryNeed,
          dietaryNeedType: nextDietaryNeed
            ? displayPlayer.dietaryNeedType || ""
            : "",
        } as Player;
      })
    );
  }

  function updateDietaryNeedType(id: string, dietaryNeedType: string) {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id
          ? ({
              ...player,
              dietaryNeed: true,
              dietaryNeedType,
            } as Player)
          : player
      )
    );
  }

  // --------------------------------------------------
  // Delete Player
  // --------------------------------------------------

  function deletePlayer(id: string) {
    const player = players.find(
      (item) => item.id === id
    );

    if (!player) {
      return;
    }

    const isRegistered =
      player.status === "Registered";

    const withdrawnPlayer =
      player as DisplayPlayer;

    const firstReserve = isRegistered
      ? players.find((item) => {
          const displayItem = item as DisplayPlayer;
          return item.status === "Waiting" && !displayItem.vacantStartListSlot;
        })
      : undefined;

    let message: string;

    if (isRegistered && firstReserve) {
      const vacancyDetails = [
        withdrawnPlayer.teeTime
          ? `Tee Time ${withdrawnPlayer.teeTime}`
          : "",
        withdrawnPlayer.group
          ? `Group ${withdrawnPlayer.group}`
          : "",
      ]
        .filter(Boolean)
        .join(" • ");

      message =
        `${player.firstName} ${player.lastName} will be withdrawn.\n\n` +
        `Reserve #1 ${firstReserve.firstName} ${firstReserve.lastName} will be promoted to Registered` +
        (vacancyDetails
          ? ` and will take the vacant place: ${vacancyDetails}.`
          : ".") +
        "\n\nContinue?";
    } else if (isRegistered) {
      message =
        `${player.firstName} ${player.lastName} will be withdrawn.\n\n` +
        "There are no Reserves waiting. This Start List place will be kept as a vacancy so it can be filled by a later Reserve.\n\nContinue?";
    } else {
      const reservePosition =
        reservePositionForPlayer(player.id);

      message =
        `Remove ${player.firstName} ${player.lastName}` +
        (reservePosition
          ? ` (Reserve #${reservePosition})`
          : " from the Reserves list") +
        "?";
    }

    if (!window.confirm(message)) {
      return;
    }

    setPlayers((current) => {
      const remaining = current.filter(
        (item) => item.id !== id
      );

      if (!isRegistered) {
        return remaining;
      }

      const reserveIndex = remaining.findIndex((item) => {
        const displayItem = item as DisplayPlayer;
        return item.status === "Waiting" && !displayItem.vacantStartListSlot;
      });

      if (reserveIndex === -1) {
        if (
          hasStartList &&
          (withdrawnPlayer.teeTime || withdrawnPlayer.group)
        ) {
          const vacancyRecord: Player = {
            id: crypto.randomUUID(),
            firstName: "",
            lastName: "",
            handicapIndex: 0,
            status: "Waiting",
            source: "Start List",
            paid: false,
            notes: "",
            teeTime: withdrawnPlayer.teeTime ?? "",
            group: withdrawnPlayer.group ?? "",
            vacantStartListSlot: true,
          } as Player;

          return [...remaining, vacancyRecord];
        }

        return remaining;
      }

      const promoted = remaining[reserveIndex];

      if (!promoted) {
        return remaining;
      }

      const promotedDisplay =
        promoted as DisplayPlayer;

      remaining[reserveIndex] = {
        ...promoted,
        status: "Registered",
        teeTime:
          withdrawnPlayer.teeTime ??
          promotedDisplay.teeTime ??
          "",
        group:
          withdrawnPlayer.group ??
          promotedDisplay.group ??
          "",
        promotedReserve: true,
      } as Player;

      return remaining;
    });
  }

  // --------------------------------------------------
  // Export / Print PDF
  // --------------------------------------------------

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function handleExport() {
    if (players.length === 0) {
      alert("There are no players to export.");
      return;
    }

    const printablePlayers = displayPlayers.map((player) => {
      const startListPlayer = player as DisplayPlayer;
      return {
        teeTime: startListPlayer.teeTime || "",
        group: startListPlayer.group || "",
        name: `${player.firstName} ${player.lastName}`.trim(),
        homeClub: getPlayerHomeClub(player),
        handicap: player.handicapIndex.toFixed(1),
        status:
          player.status === "Waiting"
            ? `Reserves #${reservePositionForPlayer(player.id) ?? ""}`
            : "Registered",
      };
    });

    const groupedRows = printablePlayers
      .map((player, index) => {
        const previous = printablePlayers[index - 1];
        const newGroup =
          index === 0 ||
          player.group !== previous.group ||
          player.teeTime !== previous.teeTime;

        return `
          <tr class="${newGroup ? "group-start" : ""}">
            <td>${newGroup ? escapeHtml(player.teeTime) : ""}</td>
            <td>${newGroup ? escapeHtml(player.group) : ""}</td>
            <td>${escapeHtml(player.name)}</td>
            <td>${escapeHtml(player.homeClub)}</td>
            ${includeHandicapInReport ? `<td class="handicap">${escapeHtml(player.handicap)}</td>` : ""}
            <td>${escapeHtml(player.status)}</td>
          </tr>
        `;
      })
      .join("");

    const exportWindow = window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

    if (!exportWindow) {
      alert(
        "The export window could not be opened. Please allow pop-ups for Event Desk and try again."
      );
      return;
    }

    exportWindow.document.open();
    exportWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Event Desk - Players Start List</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
      background: #ffffff;
      font-size: 11pt;
    }

    .document {
      width: 100%;
      max-width: 180mm;
      margin: 0 auto;
    }

    .header {
      border-bottom: 2px solid #dbe6f3;
      padding-bottom: 8mm;
      margin-bottom: 6mm;
    }

    h1 {
      margin: 0 0 2mm;
      font-size: 22pt;
      line-height: 1.1;
      color: #1f5fbf;
    }

    .subtitle {
      margin: 0;
      font-size: 11pt;
      color: #6b7280;
    }

    .summary {
      display: flex;
      gap: 10mm;
      margin: 0 0 6mm;
      font-size: 10pt;
      color: #4b5563;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th {
      text-align: left;
      padding: 3mm 2.5mm;
      background: #eef5fc;
      border-bottom: 1px solid #cfdbea;
      font-size: 9.5pt;
      color: #3f4d63;
    }

    td {
      padding: 2.8mm 2.5mm;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: middle;
    }

    ${includeHandicapInReport
      ? `
    th:nth-child(1), td:nth-child(1) { width: 16%; }
    th:nth-child(2), td:nth-child(2) { width: 10%; }
    th:nth-child(3), td:nth-child(3) { width: 25%; }
    th:nth-child(4), td:nth-child(4) { width: 25%; }
    th:nth-child(5), td:nth-child(5) { width: 9%; }
    th:nth-child(6), td:nth-child(6) { width: 15%; }
    `
      : `
    th:nth-child(1), td:nth-child(1) { width: 17%; }
    th:nth-child(2), td:nth-child(2) { width: 11%; }
    th:nth-child(3), td:nth-child(3) { width: 28%; }
    th:nth-child(4), td:nth-child(4) { width: 28%; }
    th:nth-child(5), td:nth-child(5) { width: 16%; }
    `}

    .handicap { text-align: center; }

    .group-start td {
      border-top: 2px solid #b8cbe0;
    }

    .footer {
      margin-top: 7mm;
      padding-top: 3mm;
      border-top: 1px solid #dbe6f3;
      font-size: 9pt;
      color: #6b7280;
    }

    @media print {
      .no-print { display: none !important; }
      .document { max-width: none; }
    }
  </style>
</head>
<body>
  <main class="document">
    <header class="header">
      <h1>Players / Start List</h1>
      <p class="subtitle">Event Desk — Player Reference</p>
    </header>

    <div class="summary">
      <span><strong>Registered:</strong> ${registeredPlayers}</span>
      <span><strong>Reserves:</strong> ${reservesPlayers}</span>
      <span><strong>Playing Field:</strong> ${playingFieldPlayers}</span>
    </div>

    <table>
      <thead>
        <tr>
          <th>Tee Time</th>
          <th>Group</th>
          <th>Player</th>
          <th>Home Club</th>
          ${includeHandicapInReport ? "<th>HI</th>" : ""}
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${groupedRows}</tbody>
    </table>

    <footer class="footer">
      Event Desk — exported for printing or electronic distribution
    </footer>
  </main>

  <div class="no-print" style="position:fixed;right:20px;top:20px;">
    <button onclick="window.print()" style="padding:10px 16px;font-size:14px;cursor:pointer;">Print / Save as PDF</button>
  </div>
</body>
</html>`);
    exportWindow.document.close();
    exportWindow.focus();
  }

  // --------------------------------------------------
  // Payment Outstanding - Export / Print
  // --------------------------------------------------

  function handleOutstandingPaymentsExport() {
    const outstanding = players
      .filter((player) => {
        const displayPlayer = player as DisplayPlayer;
        return (
          player.status === "Registered" &&
          !displayPlayer.vacantStartListSlot &&
          !player.paid
        );
      })
      .sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`
        )
      );

    if (outstanding.length === 0) {
      alert("There are no playing-field players with payment outstanding.");
      return;
    }

    const fee = Number(entryFee) || 0;
    const totalOutstanding = outstanding.length * fee;

    const formatMoney = (value: number) =>
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(value);

    const formatEventDate = (value: string): string => {
      const raw = value.trim();

      if (!raw) {
        return "";
      }

      let parsedDate: Date | null = null;

      const ukMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

      if (ukMatch) {
        parsedDate = new Date(
          Number(ukMatch[3]),
          Number(ukMatch[2]) - 1,
          Number(ukMatch[1])
        );
      } else {
        const parsed = new Date(`${raw}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) {
          parsedDate = parsed;
        }
      }

      if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
        return raw;
      }

      return new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(parsedDate);
    };

    const rows = outstanding
      .map(
        (player, index) => `
          <tr>
            <td class="number">${index + 1}</td>
            <td>${escapeHtml(`${player.firstName} ${player.lastName}`.trim())}</td>
            <td class="amount">${escapeHtml(formatMoney(fee))}</td>
          </tr>`
      )
      .join("");

    const exportWindow = window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

    if (!exportWindow) {
      alert(
        "The export window could not be opened. Please allow pop-ups for Event Desk and try again."
      );
      return;
    }

    const displayEventName =
      eventName.trim() || "Untitled Event";
    const displayEventDate = formatEventDate(eventDate);

    exportWindow.document.open();
    exportWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Event Desk - Payment Outstanding - ${escapeHtml(displayEventName)}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
      background: #ffffff;
      font-size: 11pt;
    }

    .document {
      width: 100%;
      max-width: 180mm;
      margin: 0 auto;
    }

    .event-header {
      border-bottom: 2px solid #dbe6f3;
      padding-bottom: 6mm;
      margin-bottom: 7mm;
    }

    .desk-title {
      margin: 0 0 4mm;
      font-size: 11pt;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.2px;
    }

    .event-name {
      margin: 0;
      font-size: 24pt;
      line-height: 1.15;
      color: #1f5fbf;
    }

    .event-date {
      margin: 2mm 0 0;
      font-size: 12pt;
      color: #4b5563;
    }

    .report-heading {
      margin-bottom: 6mm;
    }

    .report-heading h2 {
      margin: 0 0 2mm;
      font-size: 19pt;
      color: #1f2937;
    }

    .report-heading p {
      margin: 0;
      color: #6b7280;
      font-size: 10.5pt;
    }

    .summary {
      display: flex;
      gap: 12mm;
      padding: 4mm 5mm;
      margin: 0 0 6mm;
      background: #f8fafc;
      border: 1px solid #dbe6f3;
      border-radius: 6px;
      color: #374151;
      font-size: 10.5pt;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th {
      text-align: left;
      padding: 3mm 2.5mm;
      background: #eef5fc;
      border-bottom: 1px solid #cfdbea;
      font-size: 9.5pt;
      color: #3f4d63;
    }

    td {
      padding: 2.8mm 2.5mm;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: middle;
    }

    th:nth-child(1), td:nth-child(1) {
      width: 12%;
      text-align: center;
    }

    th:nth-child(2), td:nth-child(2) {
      width: 63%;
    }

    th:nth-child(3), td:nth-child(3) {
      width: 25%;
      text-align: right;
    }

    .number {
      color: #64748b;
    }

    .amount {
      font-weight: 700;
    }

    .footer {
      margin-top: 7mm;
      padding-top: 3mm;
      border-top: 1px solid #dbe6f3;
      font-size: 9pt;
      color: #6b7280;
    }

    @media print {
      .no-print { display: none !important; }
      .document { max-width: none; }
    }
  </style>
</head>
<body>
  <main class="document">
    <header class="event-header">
      <p class="desk-title">Ramsdale Seniors Event Desk</p>
      <h1 class="event-name">${escapeHtml(displayEventName)}</h1>
      ${
        displayEventDate
          ? `<p class="event-date">${escapeHtml(displayEventDate)}</p>`
          : ""
      }
    </header>

    <section class="report-heading">
      <h2>Payment Outstanding</h2>
      <p>Players in the playing field who have not yet paid.</p>
    </section>

    <div class="summary">
      <span><strong>Outstanding payments:</strong> ${outstanding.length}</span>
      <span><strong>Total amount outstanding:</strong> ${escapeHtml(
        formatMoney(totalOutstanding)
      )}</span>
    </div>

    <table>
      <thead>
        <tr>
          <th>No.</th>
          <th>Player Name</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <footer class="footer">
      Event Desk — payment outstanding list — playing field only; reserves excluded
    </footer>
  </main>

  <div class="no-print" style="position:fixed;right:20px;top:20px;">
    <button onclick="window.print()" style="padding:10px 16px;font-size:14px;cursor:pointer;">Print / Save as PDF</button>
  </div>
</body>
</html>`);
    exportWindow.document.close();
    exportWindow.focus();
  }

  // --------------------------------------------------
  // Player Display Order
  // --------------------------------------------------

  function teeTimeToMinutes(value?: string): number {
    const match = (value || "").trim().match(/^(\d{1,2}):(\d{2})$/);

    if (!match) {
      return Number.MAX_SAFE_INTEGER;
    }

    return Number(match[1]) * 60 + Number(match[2]);
  }

  const displayPlayers = players
    .filter((player) => !(player as DisplayPlayer).vacantStartListSlot)
    .sort((a, b) => {
    const aDisplay = a as DisplayPlayer;
    const bDisplay = b as DisplayPlayer;

    if (a.status === "Waiting" && b.status !== "Waiting") return 1;
    if (a.status !== "Waiting" && b.status === "Waiting") return -1;
    if (a.status === "Waiting" && b.status === "Waiting") return 0;

    const timeDifference = teeTimeToMinutes(aDisplay.teeTime) - teeTimeToMinutes(bDisplay.teeTime);
    if (timeDifference !== 0) return timeDifference;

    const aGroup = Number(aDisplay.group);
    const bGroup = Number(bDisplay.group);
    if (Number.isFinite(aGroup) && Number.isFinite(bGroup) && aGroup !== bGroup) return aGroup - bGroup;

    return 0;
  });

  // --------------------------------------------------
  // Summary Cards
  // --------------------------------------------------

  const summary = (
    <div className="page-summary">
      <SummaryCard
        title="Registered"
        value={registeredPlayers}
      />

      <SummaryCard
        title="Reserves"
        value={reservesPlayers}
      />

      <SummaryCard
        title="Paid"
        value={paidPlayers}
      />

      <SummaryCard
        title="Payment Outstanding"
        value={outstandingPlayers}
      />

      <SummaryCard
        title="Players"
        value={`${playingFieldPlayers} / ${EVENT_CAPACITY}`}
      />
    </div>
  );

  // --------------------------------------------------
  // Action Tiles
  // --------------------------------------------------

  const actions = (
    <div className="page-actions">
      <ActionTile
        icon={UserPlus}
        title="Add Player"
        primary
        onClick={() =>
          setShowAddPlayer(true)
        }
      />

      <ActionTile
        icon={FileUp}
        subtitle="Import"
        title="CSV"
        onClick={handleImportCsvClick}
      />

      <ActionTile
        icon={FileSpreadsheet}
        subtitle="Import"
        title="Excel"
        onClick={handleImportExcelClick}
      />

      <ActionTile
        icon={Flag}
        subtitle="Import"
        title="Start List"
        onClick={handleImportStartListClick}
      />

      <ActionTile
        icon={Download}
        title="Export"
        onClick={handleExport}
      />

      <ActionTile
        icon={CirclePoundSterling}
        subtitle="Payment"
        title="Outstanding"
        onClick={handleOutstandingPaymentsExport}
        disabled={outstandingPlayers === 0}
      />

      <ActionTile
        icon={Trash2}
        subtitle="Clear"
        title="All Players"
        onClick={clearAllPlayers}
        disabled={players.length === 0}
      />
    </div>
  );

  // --------------------------------------------------
  // Page
  // --------------------------------------------------

  return (
    <>
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleCsvFileChange}
        style={{ display: "none" }}
      />

      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleExcelFileChange}
        style={{ display: "none" }}
      />

      <input
        id="start-list-file-input"
        ref={startListInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleStartListFileChange}
        style={{ display: "none" }}
      />

      <PageLayout
        title="Players"
        subtitle="Manage player registrations, imports, payments and event participants."
        summary={summary}
        actions={actions}
        footer={`${registeredPlayers} Registered • ${reservesPlayers} ${reservesPlayers === 1 ? "Reserve" : "Reserves"} • ${playingFieldPlayers} Playing Field`}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "0 0 14px",
            padding: "10px 14px",
            border: "1px solid #9fbfe5",
            borderRadius: "8px",
            background: "#f8fbff",
            width: "fit-content",
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "9px",
              fontWeight: 700,
              color: "#374151",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={includeHandicapInReport}
              onChange={(event) =>
                setIncludeHandicapInReport(event.target.checked)
              }
              style={{
                width: "18px",
                height: "18px",
                accentColor: "#1f5fbf",
                cursor: "pointer",
              }}
            />
            Include Handicap (HI) in print / export
          </label>
        </div>

        <div className="players-table">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Tee Time</th>
                <th>Group</th>
                <th>Name</th>
                <th>Home Club</th>
                <th>Gender</th>
                <th>HI</th>
                <th>Paid</th>
                <th>Source</th>
                <th>Dietary Need</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {players.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="empty-table"
                  >
                    <strong>
                      No players have been added.
                    </strong>

                    <br />

                    Click "Add Player" to
                    register your first player.
                  </td>
                </tr>
              ) : (
                displayPlayers.map((player, index) => {
                  const startListPlayer =
                    player as DisplayPlayer;

                  const previousPlayer = index > 0 ? displayPlayers[index - 1] : undefined;
                  const startsReserveSection =
                    player.status === "Waiting" &&
                    previousPlayer?.status !== "Waiting";

                  return [
                    startsReserveSection ? (
                        <tr key={`reserve-divider-${player.id}`}>
                          <td
                            colSpan={11}
                            style={{
                              padding: "14px 16px",
                              borderTop: "4px solid #1f5fbf",
                              borderBottom: "2px solid #9fbfe5",
                              background: "#eef5fc",
                              color: "#1f5fbf",
                              fontWeight: 800,
                              textAlign: "center",
                              letterSpacing: "0.02em",
                            }}
                          >
                            PLAYING FIELD ENDS — {playingFieldPlayers} PLAYERS
                            <span
                              style={{
                                display: "block",
                                marginTop: "4px",
                                color: "#4b5563",
                                fontSize: "0.82rem",
                                fontWeight: 700,
                              }}
                            >
                              RESERVES / WAITING LIST
                            </span>
                          </td>
                        </tr>
                      ) : null,

                      <tr key={player.id}>
                      <td>
                        {player.status === "Waiting"
                          ? `Reserves #${reservePositionForPlayer(player.id) ?? ""}`
                          : "Registered"}
                      </td>

                      <td>
                        {startListPlayer.teeTime || ""}
                      </td>

                      <td>
                        {startListPlayer.group || ""}
                      </td>

                      <td>
                        <span
                          style={
                            startListPlayer.promotedReserve
                              ? { color: "#9a6700", fontWeight: 800 }
                              : undefined
                          }
                        >
                          {player.firstName}{" "}
                          {player.lastName}
                        </span>

                        {startListPlayer.promotedReserve && (
                          <span
                            style={{
                              display: "block",
                              marginTop: "2px",
                              color: "#9a6700",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                            }}
                          >
                            Promoted Reserve
                          </span>
                        )}
                      </td>

                      <td>
                        {getPlayerHomeClub(player)}
                      </td>

                      <td>
                        {player.gender || "—"}
                      </td>

                    <td>
                      {(() => {
                        const capWarning =
                          getHandicapCapWarning(player);

                        return (
                          <>
                            <span
                              style={
                                capWarning
                                  ? {
                                      color: "#b45309",
                                      fontWeight: 800,
                                    }
                                  : undefined
                              }
                            >
                              {player.handicapIndex.toFixed(
                                1
                              )}
                            </span>

                            {capWarning && (
                              <span
                                title={capWarning.message}
                                style={{
                                  display: "block",
                                  marginTop: "3px",
                                  color: "#b45309",
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  lineHeight: 1.15,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                ⚠ CAP {capWarning.cap.toFixed(1)}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() => togglePlayerPaid(player.id)}
                        title={player.paid ? "Click to mark payment as outstanding" : "Click to mark player as paid"}
                        style={{
                          minWidth: "58px",
                          padding: "6px 10px",
                          borderRadius: "999px",
                          border: player.paid ? "1px solid #86c79a" : "1px solid #cbd5e1",
                          background: player.paid ? "#e8f6ec" : "#f8fafc",
                          color: player.paid ? "#176b36" : "#475569",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {player.paid ? "Yes" : "No"}
                      </button>
                    </td>

                    <td>
                      {player.source}
                    </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="checkbox"
                            checked={Boolean(startListPlayer.dietaryNeed)}
                            onChange={() => toggleDietaryNeed(player.id)}
                            title="Dietary Need"
                            aria-label={`Dietary need for ${player.firstName} ${player.lastName}`}
                            style={{
                              width: "18px",
                              height: "18px",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          />

                          {startListPlayer.dietaryNeed && (
                            <select
                              value={startListPlayer.dietaryNeedType || ""}
                              onChange={(event) =>
                                updateDietaryNeedType(player.id, event.target.value)
                              }
                              aria-label={`Dietary need type for ${player.firstName} ${player.lastName}`}
                              style={{
                                minWidth: "118px",
                                padding: "5px 7px",
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",
                                background: "#ffffff",
                              }}
                            >
                              <option value="">Select...</option>
                              <option value="Vegetarian">Vegetarian</option>
                              <option value="Vegan">Vegan</option>
                              <option value="Gluten Free">Gluten Free</option>
                              <option value="Dairy Free">Dairy Free</option>
                              <option value="Nut Allergy">Nut Allergy</option>
                              <option value="Other">Other</option>
                            </select>
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          title="Delete Player"
                          aria-label={`Delete ${player.firstName} ${player.lastName}`}
                          onClick={() => deletePlayer(player.id)}
                          style={{
                            width: "34px",
                            height: "34px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "8px",
                            border: "1px solid #ef9a9a",
                            background: "#fff1f2",
                            color: "#c62828",
                            cursor: "pointer",
                            padding: 0,
                            opacity: 1,
                          }}
                        >
                          <Trash2 size={18} strokeWidth={2.25} />
                        </button>
                      </td>
                      </tr>,
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
      </PageLayout>

      {showAddPlayer && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add Player</h2>

            <div className="form-grid">
              <div>
                <label>
                  First Name
                </label>

                <input
                  value={firstName}
                  onChange={(e) =>
                    setFirstName(
                      e.target.value
                    )
                  }
                />
              </div>

              <div>
                <label>
                  Last Name
                </label>

                <input
                  value={lastName}
                  onChange={(e) =>
                    setLastName(
                      e.target.value
                    )
                  }
                />
              </div>

              <div>
                <label>
                  Handicap Index
                </label>

                <input
                  type="number"
                  step="0.1"
                  value={handicapIndex}
                  onChange={(e) =>
                    setHandicapIndex(
                      e.target.value
                    )
                  }
                />
              </div>

              <div>
                <label>
                  Gender
                </label>

                <select
                  value={gender}
                  onChange={(e) =>
                    setGender(
                      e.target.value as
                        | ""
                        | "Male"
                        | "Female"
                    )
                  }
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label>
                  Registration Status
                </label>

                <div
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #dbe6f3",
                    borderRadius: "8px",
                    background: "#f7faff",
                    color: "#374151",
                  }}
                >
                  {hasStartList
                    ? "Reserves — Start List event"
                    : registeredPlayers < EVENT_CAPACITY
                    ? "Registered — place available"
                    : "Reserves — event at capacity"}
                </div>
              </div>

              <div>
                <label>
                  Source
                </label>

                <select
                  value={source}
                  onChange={(e) =>
                    setSource(
                      e.target.value as
                        | "Manual"
                        | "CSV"
                        | "Excel"
                        | "Start List"
                    )
                  }
                >
                  <option>
                    Manual
                  </option>

                  <option>
                    CSV
                  </option>

                  <option>
                    Excel
                  </option>

                  <option>
                    Start List
                  </option>
                </select>
              </div>

              <div className="checkbox-field">
                <label>
                  <input
                    type="checkbox"
                    checked={paid}
                    onChange={(e) =>
                      setPaid(
                        e.target.checked
                      )
                    }
                  />

                  Paid
                </label>
              </div>
            </div>

            <div className="checkbox-field">
              <label>
                <input
                  type="checkbox"
                  checked={dietaryNeed}
                  onChange={(e) =>
                    setDietaryNeed(e.target.checked)
                  }
                />

                Dietary Need
              </label>
            </div>

            <div className="modal-buttons">
              <button
                className="secondary-button"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                onClick={savePlayer}
              >
                Save Player
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}