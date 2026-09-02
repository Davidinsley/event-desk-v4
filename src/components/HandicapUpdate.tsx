// HandicapUpdate.tsx
// Event Desk - Field & Draw
// Revision: Field & Draw naming update

import { useMemo, useState } from "react";
import "./HandicapUpdate.css";
import PageLayout from "../layout/PageLayout";
import type { Player } from "../types/Player";
import {
  AlertTriangle,
  Check,
  CircleAlert,
  Lock,
  Unlock,
} from "lucide-react";

interface HandicapUpdateProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

function displayHI(value: number): string {
  if (!Number.isFinite(value)) return "0.0";
  return value < 0
    ? `+${Math.abs(value).toFixed(1)}`
    : value.toFixed(1);
}

export default function HandicapUpdate({
  players,
  setPlayers,
}: HandicapUpdateProps) {
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [draftHI, setDraftHI] = useState<Record<string, string>>({});

  const registered = useMemo(
    () => players.filter((p) => p.status === "Registered"),
    [players]
  );

  const needsConfirmation = (p: Player) => p.handicapIndex <= 0;

  const outstanding = registered.filter(
    (p) => needsConfirmation(p) && !confirmed.has(p.id)
  ).length;

  const confirmedCount = registered.filter(
    (p) => needsConfirmation(p) && confirmed.has(p.id)
  ).length;

  const normalCount =
    registered.length - outstanding - confirmedCount;

  const lockedCount = registered.filter(
    (p) => p.locked
  ).length;

  const allConfirmed =
    registered.length > 0 && outstanding === 0;

  function startEditingHI(id: string, value: number) {
    setDraftHI((current) => ({
      ...current,
      [id]: displayHI(value),
    }));
  }

  function handleHIChange(id: string, text: string) {
    // Do not parse or reformat while the user is typing.
    // Keeping the draft as text prevents the cursor jumping
    // and allows normal entry such as 22.0, 0.0 and +1.5.
    setDraftHI((current) => ({
      ...current,
      [id]: text,
    }));
  }

  function commitHI(id: string, fallbackValue: number) {
    const draft = draftHI[id];

    if (draft === undefined) return;

    const raw = draft.trim();

    if (raw === "") {
      setDraftHI((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }

    const numeric = Number(raw);

    if (!Number.isFinite(numeric)) {
      setDraftHI((current) => ({
        ...current,
        [id]: displayHI(fallbackValue),
      }));
      return;
    }

    const value = raw.startsWith("+")
      ? -Math.abs(numeric)
      : numeric;

    setPlayers((current) =>
      current.map((p) =>
        p.id === id
          ? {
              ...p,
              handicapIndex: value,
              locked: false,
            }
          : p
      )
    );

    setConfirmed((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });

    setDraftHI((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function confirmHI(id: string) {
    setConfirmed(
      (current) => new Set(current).add(id)
    );
  }

  function toggleLock() {
    if (!allConfirmed) {
      window.alert(
        "Please confirm all 0.0 and plus handicaps before locking."
      );
      return;
    }

    const lock =
      lockedCount !== registered.length;

    setPlayers((current) =>
      current.map((p) =>
        p.status === "Registered"
          ? {
              ...p,
              locked: lock,
            }
          : p
      )
    );
  }

  const summary = (
    <div className="handicap-summary">
      <div className="handicap-summary-card">
        <span>Players</span>
        <strong>{registered.length}</strong>
      </div>

      <div className="handicap-summary-card">
        <span>OK</span>
        <strong className="handicap-ok">
          {normalCount}
        </strong>
      </div>

      <div className="handicap-summary-card">
        <span>Confirm</span>
        <strong className="handicap-warning">
          {confirmedCount + outstanding}
        </strong>
      </div>

      <div className="handicap-summary-card">
        <span>Locked</span>
        <strong>{lockedCount}</strong>
      </div>
    </div>
  );

  return (
    <PageLayout
      title="Field & Draw"
      subtitle="Review handicaps and create the competition field."
      summary={summary}
      footer={`${registered.length} players • ${outstanding} confirmation required`}
    >
      <div className="handicap-page">

        <section className="handicap-intro">
          <div>
            <h2>Handicap Review</h2>

            <p>
              Review the imported handicaps, correct anything
              that is wrong, and confirm unusual but valid values
              before locking.
            </p>
          </div>

          <button
            type="button"
            className={`handicap-lock-button ${
              lockedCount === registered.length &&
              registered.length
                ? "locked"
                : ""
            }`}
            onClick={toggleLock}
            disabled={
              !registered.length ||
              (!allConfirmed &&
                lockedCount !== registered.length)
            }
          >
            {lockedCount === registered.length &&
            registered.length ? (
              <>
                <Unlock size={18} />
                Unlock Handicaps
              </>
            ) : (
              <>
                <Lock size={18} />
                Lock Handicaps
              </>
            )}
          </button>
        </section>

        <div className="handicap-notice">
          <AlertTriangle size={18} />

          <div>
            <strong>
              Confirmation required for unusual values
            </strong>

            <span>
              A handicap of 0.0 or a plus handicap is valid,
              but please confirm that the HI is correct. A
              missing value is treated safely as 0.0 and will
              not cause an import error.
            </span>
          </div>
        </div>

        <section className="handicap-table-card">

          <div className="handicap-table-header">
            <div>
              <h3>Players</h3>

              <p>
                Click a HI value to correct it. Confirm 0.0
                and plus handicaps where appropriate.
              </p>
            </div>

            <div className="handicap-legend">
              <span>
                <Check size={15} />
                OK
              </span>

              <span>
                <AlertTriangle size={15} />
                Confirm
              </span>
            </div>
          </div>

          {!registered.length ? (
            <div className="handicap-empty">
              <CircleAlert size={24} />

              <strong>
                No players available.
              </strong>

              <span>
                Import or add the player list before reviewing
                handicaps.
              </span>
            </div>
          ) : (
            <div className="handicap-table-wrap">

              <table className="handicap-table">

                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Home Club</th>
                    <th>HI</th>
                    <th>Status</th>
                    <th>Note / Action</th>
                  </tr>
                </thead>

                <tbody>
                  {registered.map((player, index) => {

                    const isConfirm =
                      needsConfirmation(player);

                    const isConfirmed =
                      confirmed.has(player.id);

                    const isPlusHandicap =
                      player.handicapIndex < 0;

                    const homeClub =
                      (
                        player as Player & {
                          homeClub?: string;
                        }
                      ).homeClub ?? "";

                    return (
                      <tr key={player.id}>

                        <td>
                          {index + 1}
                        </td>

                        <td className="player-name">
                          {player.firstName}{" "}
                          {player.lastName}
                        </td>

                        <td>
                          {homeClub || "—"}
                        </td>

                        <td>
                          <input
                            className={`handicap-input ${
                              isConfirm &&
                              !isConfirmed
                                ? "needs-confirmation"
                                : ""
                            } ${
                              isPlusHandicap
                                ? "plus-handicap"
                                : ""
                            }`}
                            type="text"
                            inputMode="decimal"
                            value={
                              draftHI[player.id] ??
                              displayHI(player.handicapIndex)
                            }
                            onFocus={(e) => {
                              startEditingHI(
                                player.id,
                                player.handicapIndex
                              );
                              e.currentTarget.select();
                            }}
                            onChange={(e) =>
                              handleHIChange(
                                player.id,
                                e.target.value
                              )
                            }
                            onBlur={() =>
                              commitHI(
                                player.id,
                                player.handicapIndex
                              )
                            }
                            disabled={Boolean(
                              player.locked
                            )}
                            aria-label={`Handicap Index for ${player.firstName} ${player.lastName}`}
                          />
                        </td>

                        <td>
                          <span
                            className={`handicap-status ${
                              !isConfirm ||
                              isConfirmed
                                ? "ok"
                                : "confirm"
                            }`}
                          >
                            {!isConfirm ||
                            isConfirmed ? (
                              <Check size={15} />
                            ) : (
                              <AlertTriangle
                                size={15}
                              />
                            )}

                            {!isConfirm ||
                            isConfirmed
                              ? "OK"
                              : "Confirm"}
                          </span>
                        </td>

                        <td>
                          {isConfirm &&
                          !isConfirmed ? (
                            <button
                              type="button"
                              className="confirm-button"
                              onClick={() =>
                                confirmHI(
                                  player.id
                                )
                              }
                              disabled={Boolean(
                                player.locked
                              )}
                            >
                              Please confirm this is
                              correct HI
                            </button>
                          ) : (
                            <span className="action-note">
                              {isConfirm
                                ? "HI confirmed"
                                : "No action required"}
                            </span>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>
          )}

        </section>

        <div className="handicap-bottom-note">
          <CircleAlert size={16} />

          <span>
            Handicaps remain editable until they are locked.
            Once locked, they are ready for the draw stage.
          </span>
        </div>

      </div>
    </PageLayout>
  );
}