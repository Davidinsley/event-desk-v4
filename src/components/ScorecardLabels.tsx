import { useEffect, useMemo, useState } from "react";

import type { Event } from "../types/Event";
import type { Player } from "../types/Player";

interface ScorecardLabelsProps {
  event: Event;
  players: Player[];
  onBack: () => void;
}

type LabelPlayer = Player & {
  teeTime?: string;
  group?: string | number;
  vacantStartListSlot?: boolean;
};

type SavedLabelData = {
  playingHandicaps: Record<string, string>;
  startingTees: Record<string, string>;
};

const STORAGE_PREFIX = "eventDeskScorecardLabelsV1:";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function teeTimeToMinutes(value: string): number {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
}

export default function ScorecardLabels({
  event,
  players,
  onBack,
}: ScorecardLabelsProps) {
  const storageKey = `${STORAGE_PREFIX}${event.eventNumber || event.eventName || "event"}`;

  const [playingHandicaps, setPlayingHandicaps] = useState<Record<string, string>>({});
  const [startingTees, setStartingTees] = useState<Record<string, string>>({});
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setPlayingHandicaps({});
        setStartingTees({});
        setHydratedStorageKey(storageKey);
        return;
      }

      const saved = JSON.parse(raw) as Partial<SavedLabelData>;
      setPlayingHandicaps(saved.playingHandicaps ?? {});
      setStartingTees(saved.startingTees ?? {});
      setHydratedStorageKey(storageKey);
    } catch {
      setPlayingHandicaps({});
      setStartingTees({});
      setHydratedStorageKey(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    // Do not save until this event's existing label data has been loaded.
    // Without this guard, the component's initial empty state can overwrite
    // the saved PH/tee values before the load effect has applied them.
    if (hydratedStorageKey !== storageKey) {
      return;
    }

    const saved: SavedLabelData = { playingHandicaps, startingTees };
    localStorage.setItem(storageKey, JSON.stringify(saved));
  }, [playingHandicaps, startingTees, storageKey, hydratedStorageKey]);

  const groups = useMemo(() => {
    const grouped = new Map<string, { key: string; teeTime: string; group: string; players: LabelPlayer[] }>();

    players.forEach((rawPlayer) => {
      const player = rawPlayer as LabelPlayer;
      if (
        player.status !== "Registered" ||
        player.vacantStartListSlot ||
        !player.teeTime?.trim()
      ) {
        return;
      }

      const teeTime = player.teeTime.trim();
      const group = String(player.group ?? "").trim();
      const key = `${teeTime}|${group}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.players.push(player);
      } else {
        grouped.set(key, { key, teeTime, group, players: [player] });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => {
      const timeDifference = teeTimeToMinutes(a.teeTime) - teeTimeToMinutes(b.teeTime);
      if (timeDifference !== 0) return timeDifference;
      return Number(a.group || 0) - Number(b.group || 0);
    });
  }, [players]);

  function updatePlayingHandicap(playerId: string, value: string) {
    const cleaned = value.replace(/[^0-9+-]/g, "").slice(0, 4);
    setPlayingHandicaps((current) => ({ ...current, [playerId]: cleaned }));
  }

  function updateStartingTee(groupKey: string, value: string) {
    const cleaned = value.replace(/[^0-9A-Za-z]/g, "").slice(0, 4);
    setStartingTees((current) => ({ ...current, [groupKey]: cleaned }));
  }

  function printLabels() {
    if (groups.length === 0) {
      alert("There are no Start List tee times available for scorecard labels.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=720,height=760");
    if (!printWindow) {
      alert("The label print window could not be opened. Please allow pop-ups and try again.");
      return;
    }

    const pages = groups
      .map((group) => {
        const tee = startingTees[group.key]?.trim() || "1";
        const rows = group.players.slice(0, 4).map((player) => {
          const name = `${player.firstName} ${player.lastName}`.trim();
          const hi = Number.isFinite(player.handicapIndex)
            ? player.handicapIndex.toFixed(1)
            : "—";
          const ph = playingHandicaps[player.id]?.trim() || "___";

          return `<div class="player-row"><span class="name">${escapeHtml(name)}</span><span>HI ${escapeHtml(hi)}</span><span>PH ${escapeHtml(ph)}</span></div>`;
        }).join("");

        return `<section class="label"><div class="title">${escapeHtml(event.eventName || "Competition")}</div><div class="tee-time">${escapeHtml(group.teeTime)} - Tee ${escapeHtml(tee)}</div><div class="players">${rows}</div></section>`;
      })
      .join("");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Scorecard Labels</title>
<style>
@page { size: 60mm 29mm; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; }
.label { width: 60mm; height: 29mm; padding: 0.8mm 1.3mm; overflow: hidden; break-after: page; page-break-after: always; }
.label:last-child { break-after: auto; page-break-after: auto; }
.title { font-size: 8.6pt; line-height: 1.05; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tee-time { font-size: 8pt; line-height: 1.08; font-weight: 700; margin-top: 0.5mm; }
.players { margin-top: 0.55mm; }
.player-row { display: grid; grid-template-columns: minmax(0, 1fr) 11.5mm 11.5mm; column-gap: 0.8mm; align-items: baseline; font-size: 7.1pt; line-height: 1.17; white-space: nowrap; }
.name { overflow: hidden; text-overflow: ellipsis; }
@media screen { body { background: #e5e7eb; padding: 10mm; } .label { background: white; margin: 0 auto 8mm; box-shadow: 0 2px 10px rgba(0,0,0,.18); } }
@media print { body { background: white; } }
</style></head><body>${pages}<script>window.addEventListener('load',()=>{window.setTimeout(()=>window.print(),250);});<\/script></body></html>`);
    printWindow.document.close();
  }

  const enteredPhCount = groups.reduce(
    (total, group) => total + group.players.filter((player) => playingHandicaps[player.id]?.trim()).length,
    0
  );
  const labelPlayerCount = groups.reduce((total, group) => total + group.players.length, 0);

  return (
    <div style={{ padding: "28px", maxWidth: "1180px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", marginBottom: "22px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#1e4f89" }}>Scorecard Labels</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>
            {event.eventName || "Untitled Event"} • 60 × 29 mm • one label per tee time
          </p>
        </div>
        <button type="button" onClick={onBack} style={{ border: "1px solid #cbd5e1", borderRadius: "9px", padding: "10px 16px", background: "white", color: "#334155", fontWeight: 700, cursor: "pointer" }}>
          ← Back to Players
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "14px", marginBottom: "22px" }}>
        <div style={{ background: "white", border: "1px solid #dbe7f3", borderRadius: "12px", padding: "16px" }}><strong>Labels</strong><div style={{ fontSize: "26px", color: "#1e4f89", fontWeight: 800 }}>{groups.length}</div></div>
        <div style={{ background: "white", border: "1px solid #dbe7f3", borderRadius: "12px", padding: "16px" }}><strong>Players on labels</strong><div style={{ fontSize: "26px", color: "#1e4f89", fontWeight: 800 }}>{labelPlayerCount}</div></div>
        <div style={{ background: "white", border: "1px solid #dbe7f3", borderRadius: "12px", padding: "16px" }}><strong>PH entered</strong><div style={{ fontSize: "26px", color: "#1e4f89", fontWeight: 800 }}>{enteredPhCount} / {labelPlayerCount}</div></div>
      </div>

      {groups.length === 0 ? (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "12px", padding: "22px", color: "#9a3412" }}>
          No Start List tee times are available yet. Import or complete the Start List on the Players page first.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "18px" }}>
            {groups.map((group) => {
              const tee = startingTees[group.key] ?? "1";
              return (
                <div key={group.key} style={{ background: "white", border: "1px solid #dbe7f3", borderRadius: "14px", padding: "16px", boxShadow: "0 2px 8px rgba(31,91,159,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <strong style={{ color: "#1e4f89" }}>{group.teeTime}{group.group ? ` • Group ${group.group}` : ""}</strong>
                    <label style={{ fontSize: "13px", color: "#475569", fontWeight: 700 }}>
                      Starting Tee {" "}
                      <input value={tee} onChange={(e) => updateStartingTee(group.key, e.target.value)} style={{ width: "46px", padding: "6px", border: "1px solid #cbd5e1", borderRadius: "7px", textAlign: "center", fontWeight: 700 }} />
                    </label>
                  </div>

                  <div style={{ width: "100%", aspectRatio: "60 / 29", border: "1px solid #94a3b8", padding: "8px 10px", background: "white", color: "black", overflow: "hidden", marginBottom: "12px" }}>
                    <div style={{ fontSize: "14px", lineHeight: 1.05, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.eventName || "Competition"}</div>
                    <div style={{ fontSize: "13px", lineHeight: 1.1, fontWeight: 800, marginTop: "3px" }}>{group.teeTime} - Tee {tee || "1"}</div>
                    <div style={{ marginTop: "3px" }}>
                      {group.players.slice(0, 4).map((player) => (
                        <div key={player.id} style={{ display: "grid", gridTemplateColumns: "1fr 62px 62px", gap: "5px", fontSize: "11.5px", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{player.firstName} {player.lastName}</span>
                          <span>HI {player.handicapIndex.toFixed(1)}</span>
                          <span>PH {playingHandicaps[player.id]?.trim() || "___"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {group.players.slice(0, 4).map((player) => (
                    <div key={player.id} style={{ display: "grid", gridTemplateColumns: "1fr 70px 82px", gap: "10px", alignItems: "center", padding: "6px 0", borderTop: "1px solid #eef2f7" }}>
                      <span style={{ fontWeight: 700 }}>{player.firstName} {player.lastName}</span>
                      <span style={{ color: "#64748b" }}>HI {player.handicapIndex.toFixed(1)}</span>
                      <input aria-label={`Playing Handicap for ${player.firstName} ${player.lastName}`} placeholder="PH" value={playingHandicaps[player.id] ?? ""} onChange={(e) => updatePlayingHandicap(player.id, e.target.value)} style={{ width: "100%", padding: "7px 8px", border: "1px solid #cbd5e1", borderRadius: "7px", textAlign: "center", fontWeight: 700 }} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "22px" }}>
            <button type="button" onClick={printLabels} style={{ border: "none", borderRadius: "10px", padding: "13px 22px", background: "#2468b3", color: "white", fontSize: "16px", fontWeight: 800, cursor: "pointer" }}>
              Print All Labels
            </button>
          </div>
        </>
      )}
    </div>
  );
}
