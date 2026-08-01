import { useState } from "react";
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

export default function Players({
  players,
  setPlayers,
}: PlayersProps) {
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  // --------------------------------------------------
  // Form Fields
  // --------------------------------------------------

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [handicapIndex, setHandicapIndex] = useState("");
  const [status, setStatus] =
    useState<"Registered" | "Waiting">("Registered");

  const [source, setSource] =
    useState<"Manual" | "CSV" | "Excel" | "Start List">("Manual");

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
      />

      <ActionTile
        icon={FileSpreadsheet}
        subtitle="Import"
        title="Excel"
      />

      <ActionTile
        icon={Flag}
        subtitle="Import"
        title="Start List"
      />

      <ActionTile
        icon={Clipboard}
        title="Paste"
      />

      <ActionTile
        icon={Download}
        title="Export"
      />
    </div>
  );

  return (
    <>
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

                    <td>{player.status}</td>

                    <td>
                      {player.firstName}{" "}
                      {player.lastName}
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

                    <td>{player.source}</td>

                    <td>{player.notes}</td>

                    <td>
                      <button
                        className="icon-button"
                        title="Delete Player"
                        onClick={() =>
                          deletePlayer(player.id)
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
                <label>First Name</label>

                <input
                  value={firstName}
                  onChange={(e) =>
                    setFirstName(e.target.value)
                  }
                />
              </div>

              <div>
                <label>Last Name</label>

                <input
                  value={lastName}
                  onChange={(e) =>
                    setLastName(e.target.value)
                  }
                />
              </div>

              <div>
                <label>Handicap Index</label>

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
                <label>Status</label>

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

                <label>Source</label>

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
                  <option>Manual</option>
                  <option>CSV</option>
                  <option>Excel</option>
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

              <label>Notes</label>

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