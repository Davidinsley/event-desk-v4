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
  const [leadPlayerMode, setLeadPlayerMode] = useState(false);

  // Always open the Scorecard Labels page at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

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

  function printScorecardLabels() {
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

        return `<section class="label"><div class="label-inner"><div class="title">${escapeHtml(event.eventName || "Competition")}</div><div class="tee-time">${escapeHtml(group.teeTime)} - Tee ${escapeHtml(tee)}</div><div class="players">${rows}</div></div></section>`;
      })
      .join("");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Scorecard Labels</title>
<style>
@page { size: 29mm 60mm; margin: 0; }
* { box-sizing: border-box; }
html, body { width: 29mm; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; }
.label {
  box-sizing: border-box;
  width: 60mm;
  height: 29mm;
  margin: 0;
  padding: 0.8mm 1.3mm;
  overflow: hidden;
  transform: rotate(90deg) translateY(-29mm);
  transform-origin: top left;
  break-after: page;
  page-break-after: always;
}
.label:last-child { break-after: auto; page-break-after: auto; }
.label-inner {
  width: 100%;
  height: 100%;
  padding: 1mm 2.2mm 0 2.2mm;
  overflow: hidden;
}
.title { font-size: 11.5pt; line-height: 1.05; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tee-time { font-size: 10.5pt; line-height: 1.08; font-weight: 700; margin-top: 0.5mm; }
.players { margin-top: 0.55mm; }
.player-row { display: grid; grid-template-columns: minmax(0, 1fr) 11.5mm 11.5mm; column-gap: 0.8mm; align-items: baseline; font-size: 9.6pt; line-height: 1.16; white-space: nowrap; }
.name { overflow: hidden; text-overflow: ellipsis; }
@media screen { body { background: #e5e7eb; padding: 10mm; } .label { background: white; margin: 0 auto 8mm; box-shadow: 0 2px 10px rgba(0,0,0,.18); } }
@media print { body { background: white; } }
</style></head><body>${pages}<script>window.addEventListener('load',()=>{window.setTimeout(()=>window.print(),250);});<\/script></body></html>`);
    printWindow.document.close();
  }

  function printLeadPlayerLabels() {
    if (groups.length === 0) {
      alert("There are no Start List tee times available for lead player labels.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=760");
    if (!printWindow) {
      alert("The label print window could not be opened. Please allow pop-ups and try again.");
      return;
    }

    const pages = groups
      .map((group) => {
        const leadPlayer = group.players[0];
        const leadPlayerName = leadPlayer
          ? `${leadPlayer.firstName} ${leadPlayer.lastName}`.trim()
          : "";

        return `<section class="label"><div class="label-inner">
          <div class="flag-wrap"><img class="flag-image" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxODAgMjEwIj4KPHJlY3Qgd2lkdGg9IjE4MCIgaGVpZ2h0PSIyMTAiIGZpbGw9IndoaXRlIi8+CjxlbGxpcHNlIGN4PSI5MCIgY3k9IjE3NCIgcng9Ijc2IiByeT0iMjciIGZpbGw9IiM2OWFkM2IiLz4KPGVsbGlwc2UgY3g9IjkwIiBjeT0iMTc0IiByeD0iMTciIHJ5PSI1IiBmaWxsPSIjMjIyIi8+CjxyZWN0IHg9Ijg0IiB5PSIyNCIgd2lkdGg9IjgiIGhlaWdodD0iMTUxIiByeD0iNCIgZmlsbD0iIzIyMiIvPgo8cGF0aCBkPSJNOTIgMzEgTDE2NSA0OSBMMTM3IDcwIEwxNjUgOTEgTDkyIDEwNiBaIiBmaWxsPSIjZTEyNjFjIi8+Cjwvc3ZnPg==" alt="" /></div>
          <div class="left-content">
            <div class="seniors">RAMSDALE SENIORS</div>
            <div class="competition">${escapeHtml(event.eventName || "Competition")}</div>
            <div class="lead-caption">LEAD PLAYER</div>
            <div class="lead-name">${escapeHtml(leadPlayerName)}</div>
          </div>
          <div class="divider"></div>
          <div class="right-content">
            <div class="tee-heading">TEE TIME</div>
            <div class="lead-time">${escapeHtml(group.teeTime)}</div>
          </div>
        </div></section>`;
      })
      .join("");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Lead Player Labels</title>
<style>
@page { size: 120mm 29mm; margin: 0; }
* { box-sizing: border-box; }
html, body { width: 120mm; height: 29mm; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; }
.label {
  box-sizing: border-box;
  width: 120mm;
  height: 29mm;
  margin: 0;
  padding: 0;
  overflow: hidden;
  break-after: page;
  page-break-after: always;
}
.label:last-child { break-after: auto; page-break-after: auto; }
.label-inner {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 0.35mm solid #111;
  border-radius: 2mm;
}
.flag-wrap { position: absolute; left: 1.5mm; top: 2mm; width: 22mm; height: 25mm; display: flex; align-items: center; justify-content: center; }
.flag-image { display: block; width: 100%; height: 100%; object-fit: contain; }
.left-content { position: absolute; left: 23mm; top: 2.2mm; width: 52mm; height: 24.5mm; }
.seniors { color: #174b91; font-size: 12pt; line-height: 1; font-weight: 900; letter-spacing: 0.55pt; }
.competition { margin-top: 1.6mm; color: #111; font-size: 12.5pt; line-height: 1; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lead-caption { margin-top: 2.6mm; color: #174b91; font-size: 9pt; line-height: 1; font-weight: 900; letter-spacing: 0.45pt; }
.lead-name { margin-top: 1.2mm; color: #111; font-size: 17pt; line-height: 1; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.divider { position: absolute; left: 76mm; top: 2mm; width: 0.35mm; height: 25mm; background: #c7ced8; }
.right-content { position: absolute; left: 77.5mm; top: 2.2mm; width: 40mm; height: 24.5mm; text-align: center; }
.tee-heading { color: #174b91; font-size: 12pt; line-height: 1; font-weight: 900; letter-spacing: 0.7pt; }
.lead-time { margin-top: 2.6mm; color: #174b91; font-size: 35pt; line-height: 0.95; font-weight: 900; letter-spacing: -1.2pt; white-space: nowrap; }
@media screen {
  body { background: #e5e7eb; padding: 10mm; }
  .label { background: white; margin: 0 auto 8mm; box-shadow: 0 2px 10px rgba(0,0,0,.18); }
}
@media print { body { background: white; } }
</style></head><body>${pages}<script>window.addEventListener('load',()=>{window.setTimeout(()=>window.print(),250);});<\/script></body></html>`);
    printWindow.document.close();

    // Lead Player mode is deliberately temporary. Return Event Desk to
    // the normal 60 x 29 mm scorecard-label screen after this print run.
    setLeadPlayerMode(false);
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
            {event.eventName || "Untitled Event"} • {leadPlayerMode ? "120 × 29 mm • Lead Player labels" : "60 × 29 mm • one label per tee time"}
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

      <div style={{ background: "white", border: "1px solid #dbe7f3", borderRadius: "12px", padding: "15px 16px", marginBottom: "18px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800, color: "#334155", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={leadPlayerMode}
            onChange={(e) => setLeadPlayerMode(e.target.checked)}
            style={{ width: "18px", height: "18px", cursor: "pointer" }}
          />
          Lead Player / Tee Time Labels (120 × 29 mm)
        </label>
      </div>

      {leadPlayerMode && (
        <div style={{ background: "#fff7ed", border: "2px solid #f97316", borderRadius: "12px", padding: "16px 18px", marginBottom: "20px", color: "#9a3412" }}>
          <div style={{ fontSize: "17px", fontWeight: 900, marginBottom: "5px" }}>⚠ PRINTER SETUP REQUIRED</div>
          <div style={{ fontWeight: 700 }}>Change the Brother QL-800 label length to 120 × 29 mm in Print Setup before printing these labels.</div>
          <div style={{ marginTop: "5px" }}>After the print run, Event Desk will automatically return to the normal 60 × 29 mm Scorecard Labels screen.</div>
        </div>
      )}

      {groups.length === 0 ? (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "12px", padding: "22px", color: "#9a3412" }}>
          No Start List tee times are available yet. Import or complete the Start List on the Players page first.
        </div>
      ) : (
        <>
          {leadPlayerMode ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))", gap: "18px" }}>
              {groups.map((group) => {
                const leadPlayer = group.players[0];
                const leadPlayerName = leadPlayer ? `${leadPlayer.firstName} ${leadPlayer.lastName}`.trim() : "";
                return (
                  <div key={group.key} style={{ background: "white", border: "1px solid #dbe7f3", borderRadius: "14px", padding: "16px", boxShadow: "0 2px 8px rgba(31,91,159,0.06)" }}>
                    <div style={{ color: "#1e4f89", fontWeight: 800, marginBottom: "10px" }}>{group.teeTime}{group.group ? ` • Group ${group.group}` : ""}</div>
                    <div style={{ position: "relative", width: "100%", aspectRatio: "120 / 29", border: "1px solid #111", borderRadius: "8px", background: "white", color: "black", overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: "1.2%", top: "7%", width: "18%", height: "86%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxODAgMjEwIj4KPHJlY3Qgd2lkdGg9IjE4MCIgaGVpZ2h0PSIyMTAiIGZpbGw9IndoaXRlIi8+CjxlbGxpcHNlIGN4PSI5MCIgY3k9IjE3NCIgcng9Ijc2IiByeT0iMjciIGZpbGw9IiM2OWFkM2IiLz4KPGVsbGlwc2UgY3g9IjkwIiBjeT0iMTc0IiByeD0iMTciIHJ5PSI1IiBmaWxsPSIjMjIyIi8+CjxyZWN0IHg9Ijg0IiB5PSIyNCIgd2lkdGg9IjgiIGhlaWdodD0iMTUxIiByeD0iNCIgZmlsbD0iIzIyMiIvPgo8cGF0aCBkPSJNOTIgMzEgTDE2NSA0OSBMMTM3IDcwIEwxNjUgOTEgTDkyIDEwNiBaIiBmaWxsPSIjZTEyNjFjIi8+Cjwvc3ZnPg==" alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                      </div>
                      <div style={{ position: "absolute", left: "19.5%", top: "9%", width: "43%" }}>
                        <div style={{ color: "#174b91", fontSize: "18px", lineHeight: 1, fontWeight: 900, letterSpacing: "0.8px" }}>RAMSDALE SENIORS</div>
                        <div style={{ marginTop: "7px", fontSize: "18px", lineHeight: 1, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.eventName || "Competition"}</div>
                        <div style={{ marginTop: "11px", color: "#174b91", fontSize: "13px", lineHeight: 1, fontWeight: 900, letterSpacing: "1px" }}>LEAD PLAYER</div>
                        <div style={{ marginTop: "5px", fontSize: "26px", lineHeight: 1, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{leadPlayerName}</div>
                      </div>
                      <div style={{ position: "absolute", left: "63.5%", top: "7%", width: "1px", height: "86%", background: "#c7ced8" }} />
                      <div style={{ position: "absolute", left: "65%", top: "9%", width: "33%", textAlign: "center" }}>
                        <div style={{ color: "#174b91", fontSize: "19px", lineHeight: 1, fontWeight: 900, letterSpacing: "1px" }}>TEE TIME</div>
                        <div style={{ marginTop: "9px", color: "#174b91", fontSize: "56px", lineHeight: 1, fontWeight: 900, letterSpacing: "-2px" }}>{group.teeTime}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
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
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "22px" }}>
            <button type="button" onClick={leadPlayerMode ? printLeadPlayerLabels : printScorecardLabels} style={{ border: "none", borderRadius: "10px", padding: "13px 22px", background: "#2468b3", color: "white", fontSize: "16px", fontWeight: 800, cursor: "pointer" }}>
              {leadPlayerMode ? "Print All Lead Player Labels" : "Print All Labels"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
