import type { Event } from "../types/Event";
import {
  ArrowLeft,
  Printer,
  Share2,
} from "lucide-react";

export interface DrawPreviewRow {
  group: string;
  player: string;
  homeClub?: string;
  hi?: string;
  score?: string;
  status?: string;
}

export interface DrawPreviewMatch {
  round: string;
  match: string;
  playerA: string;
  playerB: string;
}

export interface DoubleDrawPreviewPair {
  pairNumber: number;
  player1: string;
  hi1: string;
  player2: string;
  hi2: string;
}

export interface DoubleDrawPreviewMatch {
  matchNumber: number;
  pairANumber: number;
  pairAPlayers: string;
  pairBNumber?: number;
  pairBPlayers: string;
}

export interface DoubleDrawPreviewData {
  confirmed: boolean;
  pairs: DoubleDrawPreviewPair[];
  matches: DoubleDrawPreviewMatch[];
}

export interface ClashPreviewPlayer {
  name: string;
  hi: string;
  captain?: boolean;
  reserve?: boolean;
}

export interface ClashPreviewPair {
  pairNumber: number;
  player1: ClashPreviewPlayer;
  player2: ClashPreviewPlayer;
  captainPair: boolean;
  reservePair: boolean;
}

export interface ClashPreviewMatch {
  matchNumber: number;
  redPairNumber: number;
  redPlayers: string;
  bluePairNumber: number;
  bluePlayers: string;
  captainMatch: boolean;
  reserveMatch: boolean;
}

export interface ClashPreviewData {
  confirmed: boolean;
  redTeam: ClashPreviewPlayer[];
  blueTeam: ClashPreviewPlayer[];
  redPairs: ClashPreviewPair[];
  bluePairs: ClashPreviewPair[];
  matches: ClashPreviewMatch[];
}

export interface MixedClashPreviewPlayer {
  name: string;
  hi: string;
  captain?: boolean;
}

export interface MixedClashPreviewPair {
  pairNumber: number;
  man: MixedClashPreviewPlayer;
  lady: MixedClashPreviewPlayer;
  captainPair: boolean;
}

export interface MixedClashPreviewMatch {
  matchNumber: number;
  redPairNumber: number;
  redPlayers: string;
  bluePairNumber: number;
  bluePlayers: string;
  captainMatch: boolean;
}

export interface MixedClashPreviewData {
  confirmed: boolean;
  redMen: MixedClashPreviewPlayer[];
  redLadies: MixedClashPreviewPlayer[];
  blueMen: MixedClashPreviewPlayer[];
  blueLadies: MixedClashPreviewPlayer[];
  redPairs: MixedClashPreviewPair[];
  bluePairs: MixedClashPreviewPair[];
  matches: MixedClashPreviewMatch[];
}

export interface DrawPreviewData {
  title: string;
  subtitle: string;
  rows?: DrawPreviewRow[];
  matches?: DrawPreviewMatch[];
  doubleDraw?: DoubleDrawPreviewData;
  clashDraw?: ClashPreviewData;
  mixedClashDraw?: MixedClashPreviewData;
}

interface DrawPreviewProps {
  event: Event;
  data: DrawPreviewData;
  onBack: () => void;
}

export default function DrawPreview({
  event,
  data,
  onBack,
}: DrawPreviewProps) {
  const hasBracket =
    (data.matches?.length ?? 0) > 0;

  const hasDoubleDraw =
    data.doubleDraw !== undefined;

  const hasClashDraw =
    data.clashDraw !== undefined;

  const hasMixedClashDraw =
    data.mixedClashDraw !== undefined;

  async function handleShare() {
    const shareText = [
      event.eventName ||
        "Ramsdale Seniors Event",
      event.eventDate
        ? `Date: ${event.eventDate}`
        : "",
      event.venue
        ? `Venue: ${event.venue}`
        : "",
      event.competition
        ? `Competition: ${event.competition}`
        : "",
      "",
      data.title,
      data.subtitle,
      "",
      ...(hasMixedClashDraw
        ? [
            "STEP 1 — TEAM LINE-UPS",
            "RED MEN",
            ...(data.mixedClashDraw?.redMen ?? []).map((p, i) => `${i + 1}. ${p.name} (${p.hi})${p.captain ? " — CAPTAIN" : ""}`),
            "", "RED LADIES",
            ...(data.mixedClashDraw?.redLadies ?? []).map((p, i) => `${i + 1}. ${p.name} (${p.hi})${p.captain ? " — CAPTAIN" : ""}`),
            "", "BLUE MEN",
            ...(data.mixedClashDraw?.blueMen ?? []).map((p, i) => `${i + 1}. ${p.name} (${p.hi})${p.captain ? " — CAPTAIN" : ""}`),
            "", "BLUE LADIES",
            ...(data.mixedClashDraw?.blueLadies ?? []).map((p, i) => `${i + 1}. ${p.name} (${p.hi})${p.captain ? " — CAPTAIN" : ""}`),
            "", "STEP 2 — MIXED PAIRS DRAW",
            "RED MIXED PAIRS",
            ...(data.mixedClashDraw?.redPairs ?? []).map((p) => `Pair ${p.pairNumber}: ${p.man.name} / ${p.lady.name}`),
            "", "BLUE MIXED PAIRS",
            ...(data.mixedClashDraw?.bluePairs ?? []).map((p) => `Pair ${p.pairNumber}: ${p.man.name} / ${p.lady.name}`),
            "", "STEP 3 — RED v BLUE MATCH DRAW",
            ...(data.mixedClashDraw?.matches ?? []).map((m) => `Match ${m.matchNumber}: ${m.redPlayers} v ${m.bluePlayers}`),
          ]
        : hasClashDraw
        ? [
            "STEP 1 — TEAM LINE-UPS",
            "RED TEAM",
            ...(data.clashDraw?.redTeam ?? []).map(
              (player, index) =>
                `${index + 1}. ${player.name} (${player.hi})${player.captain ? " — CAPTAIN" : ""}`
            ),
            "",
            "BLUE TEAM",
            ...(data.clashDraw?.blueTeam ?? []).map(
              (player, index) =>
                `${index + 1}. ${player.name} (${player.hi})${player.captain ? " — CAPTAIN" : ""}`
            ),
            "",
            "STEP 2 — TEAM PAIRS DRAW",
            "RED PAIRS",
            ...(data.clashDraw?.redPairs ?? []).map(
              (pair) =>
                `Pair ${pair.pairNumber}: ${pair.player1.name} / ${pair.player2.name}`
            ),
            "",
            "BLUE PAIRS",
            ...(data.clashDraw?.bluePairs ?? []).map(
              (pair) =>
                `Pair ${pair.pairNumber}: ${pair.player1.name} / ${pair.player2.name}`
            ),
            "",
            "STEP 3 — RED v BLUE MATCH DRAW",
            ...(data.clashDraw?.matches ?? []).map(
              (match) =>
                `Match ${match.matchNumber}: ${match.redPlayers} v ${match.bluePlayers}`
            ),
          ]
        : hasDoubleDraw
        ? [
            "STEP 1 — PAIRS DRAW",
            ...(data.doubleDraw?.pairs ?? []).map(
              (pair) =>
                `Pair ${pair.pairNumber}: ${pair.player1} (${pair.hi1}) / ${pair.player2} (${pair.hi2})`
            ),
            "",
            "STEP 2 — MATCH DRAW",
            ...(data.doubleDraw?.matches ?? []).map(
              (match) =>
                `Match ${match.matchNumber}: Pair ${match.pairANumber} ${match.pairAPlayers} v ${
                  match.pairBNumber !== undefined
                    ? `Pair ${match.pairBNumber} ${match.pairBPlayers}`
                    : match.pairBPlayers
                }`
            ),
          ]
        : hasBracket
        ? (data.matches ?? []).map(
            (match) =>
              `${match.round} — ${match.match}: ${match.playerA} v ${match.playerB}`
          )
        : (data.rows ?? []).map(
            (row) =>
              `Group ${row.group}: ${row.player}${
                row.homeClub
                  ? ` — ${row.homeClub}`
                  : ""
              }${
                row.score
                  ? ` — ${row.score}`
                  : ""
              }`
          )),
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (
        navigator.share &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title:
            event.eventName ||
            "Ramsdale Seniors Event",
          text: shareText,
        });
        return;
      }

      await navigator.clipboard.writeText(
        shareText
      );

      window.alert(
        "The draw details have been copied to the clipboard and are ready to share."
      );
    } catch {
      // User cancellation is normal. No error
      // message is required for that action.
    }
  }

  function handlePrint() {
    if (hasMixedClashDraw && data.mixedClashDraw) {
      const escapeHtml = (value: string | number | undefined) => String(value ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
      const d = data.mixedClashDraw;
      const eventName = escapeHtml(event.eventName || "Untitled Event");
      const meta = `${escapeHtml(event.eventDate || "Date not entered")}${event.venue ? ` • ${escapeHtml(event.venue)}` : ""}`;
      const player = (p: MixedClashPreviewPlayer) => `${escapeHtml(p.name)}${p.captain ? ' <span class="captain">CAPTAIN</span>' : ""}`;
      const lineup = (title: string, team: MixedClashPreviewPlayer[], cls: string) => `<div><h3 class="${cls}">${title}</h3><table><thead><tr><th>No.</th><th>Player</th><th>HI</th></tr></thead><tbody>${team.map((p,i)=>`<tr><td>${i+1}</td><td>${player(p)}</td><td>${escapeHtml(p.hi)}</td></tr>`).join("")}</tbody></table></div>`;
      const pairs = (title: string, list: MixedClashPreviewPair[], cls: string) => `<div><h3 class="${cls}">${title}</h3><table><thead><tr><th>Pair</th><th>Man</th><th>Lady</th></tr></thead><tbody>${list.map(p=>`<tr><td><strong>Pair ${p.pairNumber}</strong>${p.captainPair ? '<div class="note">CAPTAINS PAIR</div>' : ""}</td><td>${player(p.man)}</td><td>${player(p.lady)}</td></tr>`).join("")}</tbody></table></div>`;
      const matchRows = d.matches.map(m=>`<tr><td><strong>Match ${m.matchNumber}</strong>${m.captainMatch ? '<div class="note">CAPTAINS — FIRST TEE GROUP</div>' : ""}</td><td><span class="ref">Pair ${m.redPairNumber}</span>${escapeHtml(m.redPlayers)}</td><td><span class="ref">Pair ${m.bluePairNumber}</span>${escapeHtml(m.bluePlayers)}</td></tr>`).join("");
      const pages = [
        `<section class="page"><header><div class="event">${eventName}</div><div class="meta">${meta}</div>${event.competition ? `<div class="meta">${escapeHtml(event.competition)}</div>` : ""}</header><div class="title">Mixed Clash Pairs</div><div class="status">${d.confirmed ? "DRAW CONFIRMED" : "DRAW PROPOSED"}</div><h2>① STEP 1 — TEAM LINE-UPS</h2><div class="four">${lineup("RED MEN",d.redMen,"red")}${lineup("RED LADIES",d.redLadies,"red")}${lineup("BLUE MEN",d.blueMen,"blue")}${lineup("BLUE LADIES",d.blueLadies,"blue")}</div><div class="pn">Page 1 of 3</div></section>`,
        `<section class="page"><div class="cont">Mixed Clash Pairs</div><h2>② STEP 2 — MIXED PAIRS DRAW</h2><div class="two">${pairs("RED MIXED PAIRS",d.redPairs,"red")}${pairs("BLUE MIXED PAIRS",d.bluePairs,"blue")}</div><div class="pn">Page 2 of 3</div></section>`,
        `<section class="page"><div class="cont">Mixed Clash Pairs</div><h2>③ STEP 3 — RED v BLUE MATCH DRAW</h2><table><thead><tr><th>Match</th><th>RED PAIR</th><th>BLUE PAIR</th></tr></thead><tbody>${matchRows}</tbody></table><div class="pn">Page 3 of 3</div></section>`
      ];
      const w = window.open("", "EventDeskMixedClashPrint");
      if (!w) { window.alert("The print window was blocked. Please allow pop-ups for Event Desk and try again."); return; }
      w.document.open();
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${eventName} - Mixed Clash Pairs</title><style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:white;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#243247}.page{width:100%;position:relative;page-break-after:always;break-after:page;padding-bottom:6mm}.page:last-child{page-break-after:auto;break-after:auto}header{border-bottom:1.5px solid #cfddeb;padding-bottom:3mm;margin-bottom:3mm}.event{font-size:19pt;font-weight:800;color:#205b9f}.meta{margin-top:1mm;font-size:8.5pt;color:#64748b}.title{font-size:16pt;font-weight:800;color:#205b9f;margin-bottom:1.5mm}.status{display:inline-block;padding:1mm 2.5mm;border-radius:99px;background:#edf7ef;color:#24713a;font-size:7.5pt;font-weight:800;margin-bottom:2mm}.cont{font-size:10pt;font-weight:700;color:#64748b;margin-bottom:4mm}h2{margin:0 0 3mm;color:#205b9f;font-size:13pt}h3{margin:0 0 1mm;font-size:9pt}.red{color:#b42318}.blue{color:#205b9f}.four{display:grid;grid-template-columns:1fr 1fr;gap:4mm 6mm}.two{display:grid;grid-template-columns:1fr 1fr;gap:6mm;align-items:start}table{width:100%;border-collapse:collapse}th{text-align:left;padding:1mm 1.5mm;background:#eef5fc;color:#3f4d63;font-size:7.5pt}td{padding:.85mm 1.5mm;border-bottom:.3mm solid #e5e7eb;font-size:7.5pt;vertical-align:top}tr{page-break-inside:avoid}.captain,.note{font-size:6.3pt;font-weight:800;color:#205b9f}.ref{display:block;font-size:6.5pt;font-weight:800;color:#64748b}.pn{position:absolute;bottom:0;right:0;font-size:8pt;color:#7b8798}@media screen{body{background:#eef2f6}.page{margin:8mm auto;background:white;box-shadow:0 2px 10px rgba(0,0,0,.12);padding:10mm;width:210mm;min-height:297mm}}@media print{.page{width:auto;min-height:0;margin:0;padding-left:0;padding-right:0}}</style></head><body>${pages.join("")}</body></html>`);
      w.document.close();
      window.setTimeout(()=>{w.focus();w.print();},350);
      return;
    }

    if (hasClashDraw && data.clashDraw) {
      const escapeHtml = (value: string | number | undefined) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

      const eventName = escapeHtml(event.eventName || "Untitled Event");
      const eventDate = escapeHtml(event.eventDate || "Date not entered");
      const venue = escapeHtml(event.venue || "");
      const competition = escapeHtml(event.competition || "");
      const status = data.clashDraw.confirmed ? "DRAW CONFIRMED" : "DRAW PROPOSED";

      const playerLabel = (player: ClashPreviewPlayer) =>
        `${escapeHtml(player.name)}${player.captain ? ' <span class="captain">CAPTAIN</span>' : ""}${player.reserve ? ' <span class="reserve">RESERVE</span>' : ""}`;

      const lineupTable = (team: ClashPreviewPlayer[], side: "RED" | "BLUE") => `
        <h3 class="${side === "RED" ? "red-title" : "blue-title"}">${side} TEAM</h3>
        <table>
          <thead><tr><th>No.</th><th>Player</th><th>HI</th></tr></thead>
          <tbody>${team.map((player, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${playerLabel(player)}</td>
              <td>${escapeHtml(player.hi)}</td>
            </tr>`).join("")}
          </tbody>
        </table>`;

      const pairTable = (pairs: ClashPreviewPair[], side: "RED" | "BLUE") => `
        <h3 class="${side === "RED" ? "red-title" : "blue-title"}">${side} PAIRS</h3>
        <table>
          <thead><tr><th>Pair</th><th>Player 1</th><th>Player 2</th></tr></thead>
          <tbody>${pairs.map((pair) => `
            <tr>
              <td><strong>Pair ${pair.pairNumber}</strong>${pair.captainPair ? '<div class="small-note">CAPTAIN PAIR</div>' : ""}${pair.reservePair ? '<div class="small-note reserve-text">RESERVE PAIR</div>' : ""}</td>
              <td>${playerLabel(pair.player1)}</td>
              <td>${playerLabel(pair.player2)}</td>
            </tr>`).join("")}
          </tbody>
        </table>`;

      const matchTable = `
        <table>
          <thead><tr><th>Match</th><th>RED PAIR</th><th>BLUE PAIR</th></tr></thead>
          <tbody>${data.clashDraw.matches.map((match) => `
            <tr>
              <td><strong>Match ${match.matchNumber}</strong>${match.captainMatch ? '<div class="small-note">CAPTAINS — FIRST TEE GROUP</div>' : ""}${match.reserveMatch ? '<div class="small-note reserve-text">RESERVE — LAST TEE GROUP</div>' : ""}</td>
              <td><span class="pair-ref">Pair ${match.redPairNumber}</span>${escapeHtml(match.redPlayers)}</td>
              <td><span class="pair-ref">Pair ${match.bluePairNumber}</span>${escapeHtml(match.bluePlayers)}</td>
            </tr>`).join("")}
          </tbody>
        </table>`;

      const pagesHtml = [
        `<section class="print-page clash-step-one">
          <header>
            <div class="event-name">${eventName}</div>
            <div class="event-meta">${eventDate}${venue ? ` • ${venue}` : ""}</div>
            ${competition ? `<div class="event-meta">${competition}</div>` : ""}
          </header>
          <div class="report-title">Clash Pairs</div>
          <div class="status">${status}</div>
          <h2>① STEP 1 — TEAM LINE-UPS</h2>
          <div class="two-column">${lineupTable(data.clashDraw.redTeam, "RED")}${lineupTable(data.clashDraw.blueTeam, "BLUE")}</div>
          <div class="page-number">Page 1 of 3</div>
        </section>`,
        `<section class="print-page">
          <div class="continuation">Clash Pairs</div>
          <h2>② STEP 2 — TEAM PAIRS DRAW</h2>
          <div class="two-column">${pairTable(data.clashDraw.redPairs, "RED")}${pairTable(data.clashDraw.bluePairs, "BLUE")}</div>
          <div class="page-number">Page 2 of 3</div>
        </section>`,
        `<section class="print-page">
          <div class="continuation">Clash Pairs</div>
          <h2>③ STEP 3 — RED v BLUE MATCH DRAW</h2>
          ${matchTable}
          <div class="page-number">Page 3 of 3</div>
        </section>`,
      ];

      const printWindow = window.open("", "EventDeskClashPairsPrint");
      if (!printWindow) {
        window.alert("The print window was blocked. Please allow pop-ups for Event Desk and try again.");
        return;
      }

      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${eventName} - Clash Pairs</title>
            <style>
              @page { size: A4 portrait; margin: 10mm; }
              * { box-sizing: border-box; }
              html, body { margin: 0; padding: 0; background: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #243247; }
              .print-page { width: 100%; position: relative; page-break-after: always; break-after: page; padding-bottom: 6mm; }
              .print-page:last-child { page-break-after: auto; break-after: auto; }
              header { border-bottom: 1.5px solid #cfddeb; padding-bottom: 5mm; margin-bottom: 5mm; }
              .event-name { font-size: 22pt; line-height: 1.1; font-weight: 800; color: #205b9f; }
              .event-meta { margin-top: 2mm; font-size: 10pt; color: #64748b; }
              .report-title { font-size: 18pt; font-weight: 800; color: #205b9f; margin-bottom: 3mm; }
              .status { display: inline-block; padding: 2mm 3.5mm; border-radius: 99px; background: #edf7ef; color: #24713a; font-size: 9pt; font-weight: 800; margin-bottom: 5mm; }
              .continuation { font-size: 10pt; font-weight: 700; color: #64748b; margin-bottom: 4mm; }
              h2 { margin: 0 0 4mm; color: #205b9f; font-size: 15pt; }
              h3 { margin: 0 0 2mm; font-size: 11pt; }
              .red-title { color: #b42318; }
              .blue-title { color: #205b9f; }
              .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; align-items: start; }
              table { width: 100%; border-collapse: collapse; table-layout: auto; }
              thead { display: table-header-group; }
              th { text-align: left; padding: 1.55mm 2.1mm; background: #eef5fc; color: #3f4d63; font-size: 8pt; line-height: 1.05; }
              td { padding: 1.25mm 2.1mm; border-bottom: 0.3mm solid #e5e7eb; font-size: 8pt; line-height: 1.05; vertical-align: top; }
              tr { page-break-inside: avoid; break-inside: avoid; }
              .captain { margin-left: 1.5mm; font-size: 7pt; font-weight: 800; color: #205b9f; }
              .reserve { margin-left: 1.5mm; font-size: 7pt; font-weight: 800; color: #9a6500; }
              .small-note { margin-top: 0.7mm; font-size: 6.8pt; font-weight: 800; color: #205b9f; }
              .reserve-text { color: #9a6500; }
              .pair-ref { display: block; font-size: 7pt; font-weight: 800; color: #64748b; margin-bottom: 0.7mm; }
              .page-number { position: absolute; bottom: 0; right: 0; font-size: 8pt; color: #7b8798; }

              /* Clash Step 1 only: keep both full team line-ups on one A4 page. */
              .clash-step-one header {
                padding-bottom: 2.5mm;
                margin-bottom: 2.5mm;
              }
              .clash-step-one .event-name {
                font-size: 18pt;
              }
              .clash-step-one .event-meta {
                margin-top: 1mm;
                font-size: 8.5pt;
              }
              .clash-step-one .report-title {
                font-size: 15pt;
                margin-bottom: 1.5mm;
              }
              .clash-step-one .status {
                padding: 1mm 2.5mm;
                font-size: 7.5pt;
                margin-bottom: 2mm;
              }
              .clash-step-one h2 {
                margin-bottom: 2mm;
                font-size: 12pt;
              }
              .clash-step-one h3 {
                margin-bottom: 1mm;
                font-size: 9.5pt;
              }
              .clash-step-one .two-column {
                gap: 4mm;
              }
              .clash-step-one th {
                padding: 1mm 1.6mm;
                font-size: 7.5pt;
                line-height: 1;
              }
              .clash-step-one td {
                padding: 0.85mm 1.6mm;
                font-size: 7.5pt;
                line-height: 1;
              }
              .clash-step-one .captain {
                font-size: 6.3pt;
              }
              @media screen { body { background: #eef2f6; } .print-page { margin: 8mm auto; background: white; box-shadow: 0 2px 10px rgba(0,0,0,.12); padding: 10mm; width: 210mm; min-height: 297mm; } }
              @media print {
                html, body { width: auto; }
                .print-page {
                  width: auto;
                  max-width: none;
                  min-height: 0;
                  margin: 0;
                  padding-left: 0;
                  padding-right: 0;
                }
              }
            </style>
          </head>
          <body>${pagesHtml.join("")}</body>
        </html>`);
      printWindow.document.close();

      window.setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 350);
      return;
    }

    if (!hasDoubleDraw || !data.doubleDraw) {
      window.print();
      return;
    }

    const escapeHtml = (value: string | number | undefined) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const chunk = <T,>(items: T[], size: number): T[][] => {
      const pages: T[][] = [];
      for (let index = 0; index < items.length; index += size) {
        pages.push(items.slice(index, index + size));
      }
      return pages;
    };

    // Fixed page-sized sections make Safari print this report reliably.
    // The first Step 1 page allows extra room for the event heading.
    const pairPages: DoubleDrawPreviewPair[][] = [];
    const firstPairPageSize = 20;
    const laterPairPageSize = 26;
    pairPages.push(data.doubleDraw.pairs.slice(0, firstPairPageSize));
    pairPages.push(
      ...chunk(data.doubleDraw.pairs.slice(firstPairPageSize), laterPairPageSize)
    );

    const matchPages = chunk(data.doubleDraw.matches, 20);
    const totalPages = pairPages.length + Math.max(matchPages.length, 1);

    const eventName = escapeHtml(event.eventName || "Untitled Event");
    const eventDate = escapeHtml(event.eventDate || "Date not entered");
    const venue = escapeHtml(event.venue || "");
    const competition = escapeHtml(event.competition || "");
    const status = data.doubleDraw.confirmed ? "DRAW CONFIRMED" : "DRAW PROPOSED";

    const pairTable = (pairs: DoubleDrawPreviewPair[]) => `
      <table>
        <thead><tr><th>Pair</th><th>Player 1</th><th>HI</th><th>Player 2</th><th>HI</th></tr></thead>
        <tbody>
          ${pairs.map((pair) => `
            <tr>
              <td><strong>Pair ${pair.pairNumber}</strong></td>
              <td>${escapeHtml(pair.player1)}</td>
              <td>${escapeHtml(pair.hi1)}</td>
              <td>${escapeHtml(pair.player2)}</td>
              <td>${escapeHtml(pair.hi2)}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;

    const matchTable = (matches: DoubleDrawPreviewMatch[]) => `
      <table>
        <thead><tr><th>Match</th><th>Pair</th><th>Players</th><th class="versus">v</th><th>Pair</th><th>Players</th></tr></thead>
        <tbody>
          ${matches.map((match) => `
            <tr>
              <td><strong>Match ${match.matchNumber}</strong></td>
              <td>Pair ${match.pairANumber}</td>
              <td>${escapeHtml(match.pairAPlayers)}</td>
              <td class="versus">v</td>
              <td>${match.pairBNumber !== undefined ? `Pair ${match.pairBNumber}` : "—"}</td>
              <td>${escapeHtml(match.pairBPlayers)}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;

    let pageNumber = 0;
    const pagesHtml: string[] = [];

    pairPages.forEach((pairs, index) => {
      pageNumber += 1;
      pagesHtml.push(`
        <section class="print-page">
          ${index === 0 ? `
            <header>
              <div class="event-name">${eventName}</div>
              <div class="event-meta">${eventDate}${venue ? ` • ${venue}` : ""}</div>
              ${competition ? `<div class="event-meta">${competition}</div>` : ""}
            </header>
            <div class="report-title">Double Draw Pairs</div>
            <div class="status">${status}</div>
          ` : `<div class="continuation">Double Draw Pairs — Step 1 continued</div>`}
          <h2>① STEP 1 — PAIRS DRAW${index > 0 ? " — CONTINUED" : ""}</h2>
          ${pairTable(pairs)}
          <div class="page-number">Page ${pageNumber} of ${totalPages}</div>
        </section>`);
    });

    if (matchPages.length === 0) {
      pageNumber += 1;
      pagesHtml.push(`
        <section class="print-page">
          <div class="continuation">Double Draw Pairs</div>
          <h2>② STEP 2 — MATCH DRAW</h2>
          <p>Step 2 has not yet been drawn.</p>
          <div class="page-number">Page ${pageNumber} of ${totalPages}</div>
        </section>`);
    } else {
      matchPages.forEach((matches, index) => {
        pageNumber += 1;
        pagesHtml.push(`
          <section class="print-page">
            <div class="continuation">Double Draw Pairs${index > 0 ? " — Step 2 continued" : ""}</div>
            <h2>② STEP 2 — MATCH DRAW${index > 0 ? " — CONTINUED" : ""}</h2>
            ${matchTable(matches)}
            <div class="page-number">Page ${pageNumber} of ${totalPages}</div>
          </section>`);
      });
    }

    const printWindow = window.open("", "EventDeskDoubleDrawPrint");
    if (!printWindow) {
      window.alert("The print window was blocked. Please allow pop-ups for Event Desk and try again.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${eventName} - Double Draw Pairs</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #243247; }
            .print-page { width: 190mm; position: relative; page-break-after: always; break-after: page; padding-bottom: 10mm; }
            .print-page:last-child { page-break-after: auto; break-after: auto; }
            header { border-bottom: 1.5px solid #cfddeb; padding-bottom: 5mm; margin-bottom: 5mm; }
            .event-name { font-size: 22pt; line-height: 1.1; font-weight: 800; color: #205b9f; }
            .event-meta { margin-top: 2mm; font-size: 10pt; color: #64748b; }
            .report-title { font-size: 18pt; font-weight: 800; color: #205b9f; margin-bottom: 3mm; }
            .status { display: inline-block; padding: 2mm 3.5mm; border-radius: 99px; background: #edf7ef; color: #24713a; font-size: 9pt; font-weight: 800; margin-bottom: 5mm; }
            .continuation { font-size: 10pt; font-weight: 700; color: #64748b; margin-bottom: 4mm; }
            h2 { margin: 0 0 4mm; color: #205b9f; font-size: 15pt; }
            table { width: 100%; border-collapse: collapse; table-layout: auto; }
            thead { display: table-header-group; }
            th { text-align: left; padding: 2.3mm 2.5mm; background: #eef5fc; color: #3f4d63; font-size: 9pt; }
            td { padding: 2.1mm 2.5mm; border-bottom: 0.3mm solid #e5e7eb; font-size: 9pt; vertical-align: top; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            .versus { text-align: center; font-weight: 800; width: 8mm; }
            .page-number { position: absolute; bottom: 0; right: 0; font-size: 8pt; color: #7b8798; }
            @media screen { body { background: #eef2f6; } .print-page { margin: 8mm auto; background: white; box-shadow: 0 2px 10px rgba(0,0,0,.12); padding: 10mm; width: 210mm; min-height: 297mm; } }
            @media print { .print-page { width: 190mm; min-height: 0; } }
          </style>
        </head>
        <body>${pagesHtml.join("")}</body>
      </html>`);
    printWindow.document.close();

    // Safari can return a usable named print window before its load event is
    // observable from the opener. Printing after a short delay avoids both
    // the false “blocked” result caused by noopener and missed onload events.
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 350);
  }

  return (
    <div
      className="draw-preview-page"
      style={{
        minHeight: "100%",
        background: "#f8fafc",
        padding: "28px 34px 48px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px",
          maxWidth: "1180px",
          margin: "0 auto 18px",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            border:
              "1px solid #cbd8e8",
            borderRadius: "9px",
            padding: "10px 15px",
            background: "white",
            color: "#205b9f",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              borderRadius: "9px",
              padding: "10px 15px",
              background: "#2468b3",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Printer size={17} />
            Print
          </button>

          <button
            type="button"
            onClick={handleShare}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              border:
                "1px solid #2f6db5",
              borderRadius: "9px",
              padding: "10px 15px",
              background: "white",
              color: "#205b9f",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Share2 size={17} />
            Share
          </button>
        </div>
      </div>

      <main
        className="draw-preview-document"
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          background: "white",
          border:
            "1px solid #dbe7f3",
          borderRadius: "14px",
          padding: "34px 38px 42px",
          boxSizing: "border-box",
          boxShadow:
            "0 3px 12px rgba(31,91,159,0.06)",
        }}
      >
        <header
          style={{
            borderBottom:
              "2px solid #dbe6f3",
            paddingBottom: "18px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              color: "#205b9f",
              fontWeight: 800,
              fontSize: "30px",
              lineHeight: 1.2,
            }}
          >
            {event.eventName ||
              "Untitled Event"}
          </div>

          <div
            style={{
              marginTop: "7px",
              color: "#64748b",
              fontSize: "15px",
            }}
          >
            {event.eventDate ||
              "Date not entered"}
            {event.venue
              ? ` • ${event.venue}`
              : ""}
          </div>

          {event.competition && (
            <div
              style={{
                marginTop: "4px",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              {event.competition}
            </div>
          )}
        </header>

        <section
          style={{
            marginBottom: "22px",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: "#1f5b9f",
              fontSize: "25px",
            }}
          >
            {data.title}
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              fontSize: "15px",
            }}
          >
            {data.subtitle}
          </p>
        </section>

        {hasMixedClashDraw ? (
          <div>
            <div style={{display:"inline-block",marginBottom:"20px",padding:"7px 12px",borderRadius:"999px",background:data.mixedClashDraw?.confirmed ? "#edf7ef" : "#fff7e6",color:data.mixedClashDraw?.confirmed ? "#24713a" : "#9a6500",fontWeight:800,fontSize:"13px"}}>{data.mixedClashDraw?.confirmed ? "DRAW CONFIRMED" : "DRAW PROPOSED"}</div>
            <section className="double-draw-section"><h2 style={{margin:"0 0 12px",color:"#205b9f",fontSize:"20px"}}>① STEP 1 — TEAM LINE-UPS</h2><div className="clash-grid">
              {[["RED MEN",data.mixedClashDraw?.redMen ?? [],"clash-red-title"],["RED LADIES",data.mixedClashDraw?.redLadies ?? [],"clash-red-title"],["BLUE MEN",data.mixedClashDraw?.blueMen ?? [],"clash-blue-title"],["BLUE LADIES",data.mixedClashDraw?.blueLadies ?? [],"clash-blue-title"]].map(([title,team,cls])=><div key={title as string}><h3 className={cls as string}>{title as string}</h3><table className="double-draw-table"><thead><tr><th>No.</th><th>Player</th><th>HI</th></tr></thead><tbody>{(team as MixedClashPreviewPlayer[]).map((p,i)=><tr key={`${title}-${i}`}><td>{i+1}</td><td>{p.name}{p.captain ? " (Captain)" : ""}</td><td>{p.hi}</td></tr>)}</tbody></table></div>)}
            </div></section>
            <section className="double-draw-section double-draw-step-two"><h2 style={{margin:"0 0 12px",color:"#205b9f",fontSize:"20px"}}>② STEP 2 — MIXED PAIRS DRAW</h2><div className="clash-grid">
              {[["RED MIXED PAIRS",data.mixedClashDraw?.redPairs ?? [],"clash-red-title"],["BLUE MIXED PAIRS",data.mixedClashDraw?.bluePairs ?? [],"clash-blue-title"]].map(([title,pairs,cls])=><div key={title as string}><h3 className={cls as string}>{title as string}</h3><table className="double-draw-table"><thead><tr><th>Pair</th><th>Man</th><th>Lady</th></tr></thead><tbody>{(pairs as MixedClashPreviewPair[]).map(p=><tr key={`${title}-${p.pairNumber}`}><td><strong>Pair {p.pairNumber}</strong>{p.captainPair ? " — Captains" : ""}</td><td>{p.man.name}</td><td>{p.lady.name}</td></tr>)}</tbody></table></div>)}
            </div></section>
            <section className="double-draw-section double-draw-step-two"><h2 style={{margin:"0 0 12px",color:"#205b9f",fontSize:"20px"}}>③ STEP 3 — RED v BLUE MATCH DRAW</h2><table className="double-draw-table"><thead><tr><th>Match</th><th>RED PAIR</th><th>BLUE PAIR</th></tr></thead><tbody>{(data.mixedClashDraw?.matches ?? []).map(m=><tr key={`mixed-match-${m.matchNumber}`}><td><strong>Match {m.matchNumber}</strong>{m.captainMatch ? " — Captains / First Tee" : ""}</td><td>Pair {m.redPairNumber} — {m.redPlayers}</td><td>Pair {m.bluePairNumber} — {m.bluePlayers}</td></tr>)}</tbody></table></section>
          </div>
        ) : hasClashDraw ? (
          <div>
            <div
              style={{
                display: "inline-block",
                marginBottom: "20px",
                padding: "7px 12px",
                borderRadius: "999px",
                background: data.clashDraw?.confirmed ? "#edf7ef" : "#fff7e6",
                color: data.clashDraw?.confirmed ? "#24713a" : "#9a6500",
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.03em",
              }}
            >
              {data.clashDraw?.confirmed ? "DRAW CONFIRMED" : "DRAW PROPOSED"}
            </div>

            <section className="double-draw-section">
              <h2 style={{ margin: "0 0 12px", color: "#205b9f", fontSize: "20px" }}>
                ① STEP 1 — TEAM LINE-UPS
              </h2>
              <div className="clash-grid">
                {(["red", "blue"] as const).map((side) => {
                  const team = side === "red" ? data.clashDraw?.redTeam ?? [] : data.clashDraw?.blueTeam ?? [];
                  return (
                    <div key={side}>
                      <h3 className={side === "red" ? "clash-red-title" : "clash-blue-title"}>
                        {side === "red" ? "RED TEAM" : "BLUE TEAM"}
                      </h3>
                      <table className="double-draw-table">
                        <thead><tr><th>No.</th><th>Player</th><th>HI</th></tr></thead>
                        <tbody>
                          {team.map((player, index) => (
                            <tr key={`${side}-team-${index}`}>
                              <td>{index + 1}</td>
                              <td>{player.name}{player.captain ? " (Captain)" : ""}</td>
                              <td>{player.hi}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="double-draw-section double-draw-step-two">
              <h2 style={{ margin: "0 0 12px", color: "#205b9f", fontSize: "20px" }}>
                ② STEP 2 — TEAM PAIRS DRAW
              </h2>
              <div className="clash-grid">
                {(["red", "blue"] as const).map((side) => {
                  const pairs = side === "red" ? data.clashDraw?.redPairs ?? [] : data.clashDraw?.bluePairs ?? [];
                  return (
                    <div key={`${side}-pairs`}>
                      <h3 className={side === "red" ? "clash-red-title" : "clash-blue-title"}>
                        {side === "red" ? "RED PAIRS" : "BLUE PAIRS"}
                      </h3>
                      <table className="double-draw-table">
                        <thead><tr><th>Pair</th><th>Player 1</th><th>Player 2</th></tr></thead>
                        <tbody>
                          {pairs.map((pair) => (
                            <tr key={`${side}-pair-${pair.pairNumber}`}>
                              <td><strong>Pair {pair.pairNumber}</strong>{pair.captainPair ? " — Captain" : ""}{pair.reservePair ? " — Reserve" : ""}</td>
                              <td>{pair.player1.name}</td>
                              <td>{pair.player2.name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="double-draw-section double-draw-step-two">
              <h2 style={{ margin: "0 0 12px", color: "#205b9f", fontSize: "20px" }}>
                ③ STEP 3 — RED v BLUE MATCH DRAW
              </h2>
              <table className="double-draw-table">
                <thead><tr><th>Match</th><th>RED PAIR</th><th>BLUE PAIR</th></tr></thead>
                <tbody>
                  {(data.clashDraw?.matches ?? []).map((match) => (
                    <tr key={`clash-match-${match.matchNumber}`}>
                      <td><strong>Match {match.matchNumber}</strong>{match.captainMatch ? " — Captains / First Tee" : ""}{match.reserveMatch ? " — Reserve / Last Tee" : ""}</td>
                      <td>Pair {match.redPairNumber} — {match.redPlayers}</td>
                      <td>Pair {match.bluePairNumber} — {match.bluePlayers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        ) : hasDoubleDraw ? (
          <div>
            <div
              style={{
                display: "inline-block",
                marginBottom: "20px",
                padding: "7px 12px",
                borderRadius: "999px",
                background: data.doubleDraw?.confirmed ? "#edf7ef" : "#fff7e6",
                color: data.doubleDraw?.confirmed ? "#24713a" : "#9a6500",
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.03em",
              }}
            >
              {data.doubleDraw?.confirmed ? "DRAW CONFIRMED" : "DRAW PROPOSED"}
            </div>

            <section className="double-draw-section">
              <h2 style={{ margin: "0 0 12px", color: "#205b9f", fontSize: "20px" }}>
                ① STEP 1 — PAIRS DRAW
              </h2>
              <table className="double-draw-table">
                <thead>
                  <tr>
                    <th>Pair</th><th>Player 1</th><th>HI</th><th>Player 2</th><th>HI</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.doubleDraw?.pairs ?? []).map((pair) => (
                    <tr key={`pair-${pair.pairNumber}`}>
                      <td><strong>Pair {pair.pairNumber}</strong></td>
                      <td>{pair.player1}</td><td>{pair.hi1}</td>
                      <td>{pair.player2}</td><td>{pair.hi2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="double-draw-section double-draw-step-two">
              <h2 style={{ margin: "0 0 12px", color: "#205b9f", fontSize: "20px" }}>
                ② STEP 2 — MATCH DRAW
              </h2>
              {(data.doubleDraw?.matches.length ?? 0) > 0 ? (
                <table className="double-draw-table">
                  <thead>
                    <tr>
                      <th>Match</th><th>Pair</th><th>Players</th><th>v</th><th>Pair</th><th>Players</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.doubleDraw?.matches ?? []).map((match) => (
                      <tr key={`match-${match.matchNumber}`}>
                        <td><strong>Match {match.matchNumber}</strong></td>
                        <td>Pair {match.pairANumber}</td><td>{match.pairAPlayers}</td>
                        <td style={{ textAlign: "center", fontWeight: 800 }}>v</td>
                        <td>{match.pairBNumber !== undefined ? `Pair ${match.pairBNumber}` : "—"}</td>
                        <td>{match.pairBPlayers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: "#64748b" }}>Step 2 has not yet been drawn.</p>
              )}
            </section>
          </div>
        ) : hasBracket ? (
          <div
            style={{
              display: "flex",
              gap: "18px",
              overflowX: "auto",
              alignItems:
                "flex-start",
              paddingBottom: "6px",
            }}
          >
            {Array.from(
              new Set(
                (data.matches ?? []).map(
                  (match) =>
                    match.round
                )
              )
            ).map((round) => {
              const matches =
                (data.matches ?? []).filter(
                  (match) =>
                    match.round ===
                    round
                );

              return (
                <section
                  key={round}
                  style={{
                    minWidth: "240px",
                    flex: "1 0 240px",
                  }}
                >
                  <h2
                    style={{
                      margin:
                        "0 0 12px",
                      textAlign:
                        "center",
                      color: "#205b9f",
                      fontSize:
                        "17px",
                    }}
                  >
                    {round}
                  </h2>

                  <div
                    style={{
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      gap:
                        round === "Round 1"
                          ? "10px"
                          : "28px",
                    }}
                  >
                    {matches.map(
                      (match) => (
                        <div
                          key={`${round}-${match.match}`}
                          style={{
                            border:
                              "1px solid #dbe7f3",
                            borderRadius:
                              "9px",
                            padding:
                              "10px 12px",
                            background:
                              "white",
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "12px",
                              color:
                                "#64748b",
                              marginBottom:
                                "6px",
                            }}
                          >
                            {match.match}
                          </div>

                          <div
                            style={{
                              minHeight:
                                "24px",
                              padding:
                                "4px 0",
                              borderBottom:
                                "1px solid #eef2f7",
                            }}
                          >
                            {match.playerA}
                          </div>

                          <div
                            style={{
                              minHeight:
                                "24px",
                              padding:
                                "4px 0",
                            }}
                          >
                            {match.playerB}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
              tableLayout: "fixed",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "11px",
                    background:
                      "#eef5fc",
                    color: "#3f4d63",
                  }}
                >
                  Group
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "11px",
                    background:
                      "#eef5fc",
                    color: "#3f4d63",
                  }}
                >
                  Player
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "11px",
                    background:
                      "#eef5fc",
                    color: "#3f4d63",
                  }}
                >
                  Home Club
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "11px",
                    background:
                      "#eef5fc",
                    color: "#3f4d63",
                  }}
                >
                  HI
                </th>

                {data.rows?.some(
                  (row) =>
                    row.score !==
                    undefined
                ) && (
                  <th
                    style={{
                      textAlign:
                        "left",
                      padding:
                        "11px",
                      background:
                        "#eef5fc",
                      color:
                        "#3f4d63",
                    }}
                  >
                    Score
                  </th>
                )}

                <th
                  style={{
                    textAlign: "left",
                    padding: "11px",
                    background:
                      "#eef5fc",
                    color: "#3f4d63",
                  }}
                >
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {(data.rows ?? []).map(
                (row, index) => (
                  <tr
                    key={`${row.player}-${index}`}
                  >
                    <td
                      style={{
                        padding:
                          "9px 11px",
                        borderBottom:
                          "1px solid #e5e7eb",
                      }}
                    >
                      {row.group}
                    </td>

                    <td
                      style={{
                        padding:
                          "9px 11px",
                        borderBottom:
                          "1px solid #e5e7eb",
                      }}
                    >
                      {row.player}
                    </td>

                    <td
                      style={{
                        padding:
                          "9px 11px",
                        borderBottom:
                          "1px solid #e5e7eb",
                      }}
                    >
                      {row.homeClub ?? ""}
                    </td>

                    <td
                      style={{
                        padding:
                          "9px 11px",
                        borderBottom:
                          "1px solid #e5e7eb",
                      }}
                    >
                      {row.hi ?? ""}
                    </td>

                    {data.rows?.some(
                      (item) =>
                        item.score !==
                        undefined
                    ) && (
                      <td
                        style={{
                          padding:
                            "9px 11px",
                          borderBottom:
                            "1px solid #e5e7eb",
                        }}
                      >
                        {row.score ??
                          ""}
                      </td>
                    )}

                    <td
                      style={{
                        padding:
                          "9px 11px",
                        borderBottom:
                          "1px solid #e5e7eb",
                      }}
                    >
                      {row.status ??
                        ""}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </main>

      <style>
        {`
          .double-draw-section {
            margin-top: 8px;
          }

          .clash-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            align-items: start;
          }

          .clash-red-title {
            margin: 0 0 8px;
            color: #b42318;
          }

          .clash-blue-title {
            margin: 0 0 8px;
            color: #205b9f;
          }

          .double-draw-step-two {
            margin-top: 30px;
          }

          .double-draw-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: auto;
          }

          .double-draw-table th {
            text-align: left;
            padding: 9px 10px;
            background: #eef5fc;
            color: #3f4d63;
            font-size: 13px;
          }

          .double-draw-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
            vertical-align: top;
          }

          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          @media print {
            html,
            body,
            #root {
              width: auto !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              overflow: visible !important;
            }

            .draw-preview-page {
              width: auto !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              overflow: visible !important;
              padding: 0 !important;
              background: white !important;
            }

            .draw-preview-page * {
              max-height: none !important;
            }

            .no-print {
              display: none !important;
            }

            .draw-preview-document {
              border: none !important;
              box-shadow: none !important;
              max-width: none !important;
              border-radius: 0 !important;
              padding: 0 !important;
            }

            body {
              background: white !important;
            }

            .double-draw-step-two {
              break-before: page;
              page-break-before: always;
              margin-top: 0 !important;
            }

            .double-draw-table thead {
              display: table-header-group;
            }

            .double-draw-table tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}
      </style>
    </div>
  );
}
