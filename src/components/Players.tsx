// Players.tsx
// Event Desk - Players Management
// Revision: CSV + Excel + Start List Import

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
  Clipboard,
  Download,
  Trash2,
} from "lucide-react";

interface PlayersProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

type CsvRow = Record<string, string>;

function parseHandicapIndex(value: string | number | undefined): number {
  const text = String(value ?? "").trim();
  if (text === "") return 0;

  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return 0;

  // Golf notation: +2.0 is a genuine plus handicap.
  // Store it internally as -2.0 so arithmetic can distinguish
  // it from an ordinary 2.0 handicap.
  return text.startsWith("+")
    ? -Math.abs(numeric)
    : numeric;
}

export default function Players({
  players,
  setPlayers,
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

  const [status, setStatus] =
    useState<"Registered" | "Waiting">("Registered");

  const [source, setSource] =
    useState<
      "Manual" | "CSV" | "Excel" | "Start List"
    >("Manual");

  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");

  // --------------------------------------------------
  // Summary Values
  // --------------------------------------------------

  const registeredPlayers = players.filter(
    (p) => p.status === "Registered"
  ).length;

  const waitingPlayers = players.filter(
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
    setStatus("Registered");
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

  function findPlayerHeaderRowIndex(rows: string[][]): number {
    return rows.findIndex((row) => {
      const headers = row.map(normaliseHeader);

      const hasFirstName = headers.some((header) =>
        [
          "firstname",
          "forename",
          "givenname",
        ].includes(header)
      );

      const hasLastName = headers.some((header) =>
        [
          "lastname",
          "surname",
          "familyname",
        ].includes(header)
      );

      return hasFirstName && hasLastName;
    });
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
        importedSource === "Excel"
          ? "The Excel worksheet must contain First Name and Last Name columns."
          : "The CSV must contain First Name and Last Name columns."
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

      const handicapIndex =
        parseHandicapIndex(handicapText);

      const statusValue =
        getCsvValue(row, [
          "Status",
        ]);

      const paidValue =
        getCsvValue(row, [
          "Paid",
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
      });
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

        setPlayers((current) => [
          ...current,
          ...importedPlayers,
        ]);

        if (skipped > 0) {
          alert(
            `${importedPlayers.length} player(s) imported successfully.\n\n${skipped} row(s) were skipped because they were missing a first name or last name.`
          );
        } else {
          alert(
            `${importedPlayers.length} player(s) imported successfully.`
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

        const headerRowIndex =
          findPlayerHeaderRowIndex(rows);

        if (headerRowIndex === -1) {
          throw new Error(
            "The Excel worksheet must contain First Name and Last Name columns."
          );
        }

        // External Excel files often contain a title, event name,
        // logo area or other formatted rows above the actual headers.
        // Start the player conversion at the detected header row rather
        // than assuming the first worksheet row contains column names.
        const playerRows = rows.slice(headerRowIndex);

        const {
          players: importedPlayers,
          skipped,
        } = convertPlayerRows(playerRows, "Excel");

        if (importedPlayers.length === 0) {
          alert(
            skipped > 0
              ? `No players were imported. ${skipped} row(s) were skipped because they were missing a first name or last name.`
              : "No player records were found in the Excel worksheet."
          );

          return;
        }

        setPlayers((current) => [
          ...current,
          ...importedPlayers,
        ]);

        if (skipped > 0) {
          alert(
            `${importedPlayers.length} player(s) imported successfully.\n\n${skipped} row(s) were skipped because they were missing a first name or last name.`
          );
        } else {
          alert(
            `${importedPlayers.length} player(s) imported successfully.`
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
      .split(/\\s+/)
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

        const handicapIndex = headers.findIndex(
          (header) =>
            [
              "hcpindex",
              "handicapindex",
              "handicap",
              "hi",
            ].includes(header)
        );

        const notesIndex = headers.findIndex(
          (header) =>
            ["notes", "note"].includes(header)
        );

        const importedPlayers: Player[] = [];
        let skipped = 0;

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

          const importedNotes =
            notesIndex === -1
              ? ""
              : String(
                  row[notesIndex] ?? ""
                ).trim();

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

        setPlayers((current) => [
          ...current,
          ...importedPlayers,
        ]);

        if (skipped > 0) {
          alert(
            `${importedPlayers.length} player(s) imported successfully from the Start List.\\n\\n${skipped} row(s) were skipped because they did not contain a complete player name.`
          );
        } else {
          alert(
            `${importedPlayers.length} player(s) imported successfully from the Start List.`
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
        parseHandicapIndex(handicapIndex),

      status,

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
    if (
      !window.confirm(
        "Delete this player?"
      )
    ) {
      return;
    }

    setPlayers((current) =>
      current.filter(
        (player) => player.id !== id
      )
    );
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
  // Summary Cards
  // --------------------------------------------------

  const summary = (
    <div className="page-summary">
      <SummaryCard
        title="Registered"
        value={registeredPlayers}
      />

      <SummaryCard
        title="Waiting"
        value={waitingPlayers}
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
        value={`${players.length} / 76`}
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
        icon={Clipboard}
        title="Paste"
      />

      <ActionTile
        icon={Download}
        title="Export"
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
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleStartListFileChange}
        style={{ display: "none" }}
      />

      <PageLayout
        title="Players"
        subtitle="Manage player registrations, imports, payments and event participants."
        summary={summary}
        actions={actions}
        footer={`${registeredPlayers} Registered • ${waitingPlayers} Waiting • ${players.length} Total`}
      >
        <div className="players-table">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Name</th>
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
                players.map((player) => (
                  <tr key={player.id}>
                    <td>
                      {player.status}
                    </td>

                    <td>
                      {player.firstName}{" "}
                      {player.lastName}
                    </td>

                    <td>
                      {player.handicapIndex < 0
                        ? `+${Math.abs(player.handicapIndex).toFixed(1)}`
                        : player.handicapIndex.toFixed(1)}
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
                ))
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
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as
                        | "Registered"
                        | "Waiting"
                    )
                  }
                >
                  <option>
                    Registered
                  </option>

                  <option>
                    Waiting
                  </option>
                </select>
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