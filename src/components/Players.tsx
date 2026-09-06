// Players.tsx
// Event Desk - Players Management
// Revision: CSV + Excel + Start List merge + Home Club / Tee Time / Group preservation + Event capacity + PDF Export + Home Club verification + Legacy Club compatibility

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
  Trash2,
} from "lucide-react";

interface PlayersProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  playerLimit: number;
}

type CsvRow = Record<string, string>;

type DisplayPlayer = Player & {
  teeTime?: string;
  group?: string;
  homeClub?: string;
  club?: string;
};

export default function Players({
  players,
  setPlayers,
  playerLimit,
}: PlayersProps) {
  const [showAddPlayer, setShowAddPlayer] =
    useState(false);

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

  const [source, setSource] =
    useState<
      "Manual" | "CSV" | "Excel" | "Start List"
    >("Manual");

  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");

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

  const registeredPlayers = players.filter(
    (p) => p.status === "Registered"
  ).length;

  const reservesPlayers = players.filter(
    (p) => p.status === "Waiting"
  ).length;

  const paidPlayers = players.filter(
    (p) => p.paid
  ).length;

  const outstandingPlayers =
    players.length - paidPlayers;

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  function resetForm() {
    setFirstName("");
    setLastName("");
    setHandicapIndex("");
    setSource("Manual");
    setPaid(false);
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

              next.push({
                ...imported,
                status:
                  registeredCount < EVENT_CAPACITY
                    ? "Registered"
                    : "Waiting",
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
      .filter((player) => player.status === "Waiting")
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

    const newPlayer: Player = {
      id: crypto.randomUUID(),

      firstName: firstName.trim(),
      lastName: lastName.trim(),

      handicapIndex:
        Number(handicapIndex) || 0,

      // Registration status is automatic. If the event is at capacity,
      // the new player joins the bottom of the Reserves list.
      status:
        registeredPlayers < EVENT_CAPACITY
          ? "Registered"
          : "Waiting",

      source,

      paid,

      notes: notes.trim(),
    };

    setPlayers((current) => [
      ...current,
      newPlayer,
    ]);

    closeModal();
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

    const message = isRegistered
      ? "Withdraw this registered player? If a Reserve is waiting, the first Reserve will automatically take this place."
      : "Remove this player from the Reserves list?";

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

      const reserveIndex = remaining.findIndex(
        (item) => item.status === "Waiting"
      );

      if (reserveIndex === -1) {
        return remaining;
      }

      const promoted = remaining[reserveIndex];

      if (!promoted) {
        return remaining;
      }

      remaining[reserveIndex] = {
        ...promoted,
        status: "Registered",
      };

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

    const printablePlayers = players.map((player) => {
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
            <td class="handicap">${escapeHtml(player.handicap)}</td>
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

    th:nth-child(1), td:nth-child(1) { width: 16%; }
    th:nth-child(2), td:nth-child(2) { width: 10%; }
    th:nth-child(3), td:nth-child(3) { width: 25%; }
    th:nth-child(4), td:nth-child(4) { width: 25%; }
    th:nth-child(5), td:nth-child(5) { width: 9%; }
    th:nth-child(6), td:nth-child(6) { width: 15%; }

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
      <span><strong>Total:</strong> ${players.length}</span>
    </div>

    <table>
      <thead>
        <tr>
          <th>Tee Time</th>
          <th>Group</th>
          <th>Player</th>
          <th>Home Club</th>
          <th>HI</th>
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
        title="Outstanding"
        value={outstandingPlayers}
      />

      <SummaryCard
        title="Players"
        value={`${players.length} / ${EVENT_CAPACITY}`}
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
        footer={`${registeredPlayers} Registered • ${reservesPlayers} Reserves • ${players.length} Total`}
      >
        <div className="players-table">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Tee Time</th>
                <th>Group</th>
                <th>Name</th>
                <th>Home Club</th>
                <th>HI</th>
                <th>Paid</th>
                <th>Source</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {players.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
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
                players.map((player) => {
                  const startListPlayer =
                    player as DisplayPlayer;

                  return (
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
                        {player.firstName}{" "}
                        {player.lastName}
                      </td>

                      <td>
                        {getPlayerHomeClub(player)}
                      </td>

                    <td>
                      {player.handicapIndex.toFixed(
                        1
                      )}
                    </td>

                    <td>
                      {player.paid
                        ? "Yes"
                        : "No"}
                    </td>

                    <td>
                      {player.source}
                    </td>

                      <td>
                        {player.notes}
                      </td>

                      <td>
                        <button
                        className="icon-button"
                        title="Delete Player"
                        onClick={() =>
                          deletePlayer(
                            player.id
                          )
                        }
                      >
                        <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
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
                  {registeredPlayers < EVENT_CAPACITY
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

            <div className="notes-field">
              <label>
                Notes
              </label>

              <textarea
                rows={4}
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
              />
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