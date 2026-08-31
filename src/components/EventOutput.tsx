import { useEffect, useState } from "react";
import type { Event } from "../types/Event";
import type { Player } from "../types/Player";

import "./EventOutput.css";

import PageLayout from "../layout/PageLayout";

import {
  ArrowLeft,
  Printer,
  Share2,
  CheckCircle,
  Plus,
  Trash2,
} from "lucide-react";

interface EventOutputProps {
  event: Event;
  players: Player[];
  published: boolean;
  archived: boolean;
  onBack: () => void;
}

interface KeyPrizeWinner {
  id: string;
  prize: string;
  winner: string;
}

const prizeStorageKey = (eventNumber: string) =>
  `eventDeskKeyPrizeWinners:${eventNumber}`;

const otherPrizeStorageKey = (eventNumber: string) =>
  `eventDeskOtherSignificantPrizeWinners:v2:${eventNumber}`;

const charityStorageKey = (eventNumber: string) =>
  `eventDeskCharitySummary:${eventNumber}`;

const newPrize = (): KeyPrizeWinner => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  prize: "Overall Winner",
  winner: "",
});

const newOtherPrize = (): KeyPrizeWinner => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}-other`,
  prize: "",
  winner: "",
});

export default function EventOutput({
  event,
  players,
  published,
  archived,
  onBack,
}: EventOutputProps) {
  const handlePrint = () => {
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const eventName = escapeHtml(
      event.eventName || "Unnamed Event"
    );
    const competition = escapeHtml(
      event.competition || "Competition not selected"
    );
    const eventDate = escapeHtml(
      event.eventDate || "Not Set"
    );
    const venue = escapeHtml(
      event.venue || "Not Set"
    );
    const format = escapeHtml(
      event.competitionFormat || "Not Set"
    );
    const rounds = escapeHtml(
      String(event.competitionRounds || "Not Set")
    );
    const handicap = escapeHtml(
      `${event.handicapAllowance ?? "Not Set"}%`
    );
    const teeColour = escapeHtml(
      event.teeColour || "Not Set"
    );
    const entryFee = escapeHtml(
      `£${event.entryFee.toFixed(2)}`
    );
    const playerCount = String(players.length);

    const statusTitle = archived
      ? "Archived Event Record"
      : published
      ? "Official Event Summary"
      : "Draft Event Preview";

    const statusText = archived
      ? "This is the read-only historical event record."
      : published
      ? "This is the current official published event record."
      : "Preview of the current event information before publication.";

    const prizeRows = keyPrizes
      .filter(
        (item) =>
          item.prize.trim() !== "" ||
          item.winner.trim() !== ""
      )
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.prize || "Prize")}</td>
            <td>${escapeHtml(item.winner || "Not recorded")}</td>
          </tr>
        `
      )
      .join("");

    const otherPrizeRows = otherPrizes
      .filter(
        (item) =>
          item.prize.trim() !== "" ||
          item.winner.trim() !== ""
      )
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.prize || "Prize")}</td>
            <td>${escapeHtml(item.winner || "Not recorded")}</td>
          </tr>
        `
      )
      .join("");

    const charityValue =
      charityInvolved && charityAmount.trim()
        ? `£${Number(charityAmount).toFixed(2)}`
        : "";

    const previewWindow = window.open(
      "",
      "event-output-print",
      "width=980,height=900"
    );

    if (!previewWindow) {
      window.print();
      return;
    }

    previewWindow.document.open();
    previewWindow.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>
            Event ${escapeHtml(event.eventNumber)} - ${eventName}
          </title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #24364b;
              font-family: Arial, Helvetica, sans-serif;
            }

            body {
              width: 100%;
            }

            .sheet {
              width: 194mm;
              margin: 0 auto;
            }

            .header {
              border-bottom: 1.2mm solid #2f6db5;
              padding-bottom: 8mm;
              margin-bottom: 9mm;
              display: grid;
              grid-template-columns: 1fr auto;
              gap: 10mm;
              align-items: start;
            }

            .brand {
              color: #205b9f;
              font-size: 13pt;
              font-weight: 800;
              letter-spacing: 1.1pt;
              text-transform: uppercase;
              margin-bottom: 2mm;
            }

            .title {
              margin: 0;
              color: #1e4f9b;
              font-size: 30pt;
              line-height: 1.05;
              font-weight: 800;
            }

            .competition {
              margin: 3mm 0 0;
              font-size: 17pt;
              color: #5b6b80;
              font-weight: 600;
            }

            .event-number {
              min-width: 28mm;
              padding: 4.5mm 5mm;
              border-radius: 4mm;
              background: #eef5fb;
              text-align: center;
              color: #205b9f;
              font-size: 13pt;
              font-weight: 800;
              line-height: 1.1;
            }

            .event-number strong {
              display: block;
              margin-top: 1mm;
              font-size: 21pt;
            }

            .status {
              display: flex;
              gap: 3mm;
              align-items: flex-start;
              border: 0.4mm solid #bfe4ca;
              border-radius: 3mm;
              background: #f1fbf4;
              padding: 4.5mm 5mm;
              margin-bottom: 9mm;
            }

            .status-icon {
              width: 6mm;
              height: 6mm;
              border: 0.6mm solid #2e9b58;
              border-radius: 50%;
              flex: 0 0 auto;
              margin-top: 0.6mm;
            }

            .status-title {
              color: #2e7d4b;
              font-size: 13pt;
              font-weight: 800;
              margin-bottom: 0.8mm;
            }

            .status-text {
              color: #526173;
              font-size: 13pt;
              line-height: 1.25;
            }

            .section {
              margin: 0 0 10mm;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .section-heading {
              margin: 0 0 3mm;
              padding-bottom: 1.8mm;
              border-bottom: 0.4mm solid #dbe5ef;
              color: #205b9f;
              font-size: 17pt;
              line-height: 1.1;
              font-weight: 800;
            }

            .details {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10mm;
            }

            .detail-label {
              display: block;
              margin-bottom: 1.8mm;
              color: #718096;
              font-size: 8.5pt;
              font-weight: 800;
              letter-spacing: 0.4pt;
            }

            .detail-value {
              display: block;
              color: #24364b;
              font-size: 13pt;
              font-weight: 700;
              line-height: 1.15;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            th,
            td {
              border-bottom: 0.35mm solid #dbe5ef;
              padding: 4mm 4mm;
              text-align: left;
            }

            th {
              background: #eef5fb;
              color: #205b9f;
              font-size: 13pt;
              font-weight: 800;
              letter-spacing: 0.4pt;
            }

            td {
              color: #24364b;
              font-size: 13.5pt;
              font-weight: 700;
              line-height: 1.2;
            }

            th:first-child,
            td:first-child {
              width: 48%;
            }

            .charity-callout {
              border: 0.5mm solid #bfe4ca;
              border-radius: 3mm;
              background: #f1fbf4;
              padding: 5mm 6mm;
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 8mm;
            }

            .charity-label {
              color: #2e7d4b;
              font-size: 13pt;
              font-weight: 800;
            }

            .charity-amount {
              color: #205b9f;
              font-size: 22pt;
              font-weight: 800;
              white-space: nowrap;
            }

            .footer {
              margin-top: 11mm;
              padding-top: 3mm;
              border-top: 0.35mm solid #dbe5ef;
              display: flex;
              justify-content: space-between;
              gap: 8mm;
              color: #7a8796;
              font-size: 8.5pt;
            }

            @media print {
              .section {
                break-inside: avoid;
                page-break-inside: avoid;
              }

              .sheet {
                width: 194mm;
                margin: 0 auto;
              }
            }
          </style>
        </head>
        <body>
          <main class="sheet">
            <header class="header">
              <div>
                <div class="brand">Ramsdale Seniors Event Desk</div>
                <h1 class="title">${eventName}</h1>
                <p class="competition">${competition}</p>
              </div>

              <div class="event-number">
                EVENT
                <strong>${escapeHtml(event.eventNumber)}</strong>
              </div>
            </header>

            <section class="status">
              <div class="status-icon"></div>
              <div>
                <div class="status-title">
                  ${escapeHtml(statusTitle)}
                </div>
                <div class="status-text">
                  ${escapeHtml(statusText)}
                </div>
              </div>
            </section>

            <section class="section">
              <h2 class="section-heading">Event Details</h2>
              <div class="details">
                <div>
                  <span class="detail-label">DATE</span>
                  <span class="detail-value">${eventDate}</span>
                </div>
                <div>
                  <span class="detail-label">VENUE</span>
                  <span class="detail-value">${venue}</span>
                </div>
                <div>
                  <span class="detail-label">FORMAT</span>
                  <span class="detail-value">${format}</span>
                </div>
                <div>
                  <span class="detail-label">PLAYERS ENTERED</span>
                  <span class="detail-value">${playerCount}</span>
                </div>
              </div>
            </section>

            <section class="section">
              <h2 class="section-heading">Competition Summary</h2>
              <div class="details">
                <div>
                  <span class="detail-label">ROUNDS</span>
                  <span class="detail-value">${rounds}</span>
                </div>
                <div>
                  <span class="detail-label">HANDICAP ALLOWANCE</span>
                  <span class="detail-value">${handicap}</span>
                </div>
                <div>
                  <span class="detail-label">TEE COLOUR</span>
                  <span class="detail-value">${teeColour}</span>
                </div>
                <div>
                  <span class="detail-label">ENTRY FEE</span>
                  <span class="detail-value">${entryFee}</span>
                </div>
              </div>
            </section>

            <section class="section">
              <h2 class="section-heading">Key Prize Winners</h2>
              ${
                prizeRows
                  ? `
                    <table>
                      <thead>
                        <tr>
                          <th>KEY PRIZE</th>
                          <th>WINNER</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${prizeRows}
                      </tbody>
                    </table>
                  `
                  : `<div class="detail-value">No key prize winners recorded.</div>`
              }
            </section>

            ${
              otherPrizeRows
                ? `
                  <section class="section">
                    <h2 class="section-heading">Other Significant Prize Winners</h2>
                    <table>
                      <thead>
                        <tr>
                          <th>PRIZE</th>
                          <th>WINNER</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${otherPrizeRows}
                      </tbody>
                    </table>
                  </section>
                `
                : ""
            }

            ${
              charityValue
                ? `
                  <section class="section">
                    <h2 class="section-heading">Charity</h2>
                    <div class="charity-callout">
                      <div class="charity-label">Amount Raised for Charity</div>
                      <div class="charity-amount">${escapeHtml(charityValue)}</div>
                    </div>
                  </section>
                `
                : ""
            }

            <footer class="footer">
              <span>Ramsdale Seniors Event Desk</span>
              <span>Event ${escapeHtml(event.eventNumber)}</span>
            </footer>
          </main>

          <script>
            const returnToEventDesk = () => {
              try {
                window.opener?.focus();
              } finally {
                window.close();
              }
            };

            window.addEventListener("afterprint", returnToEventDesk);

            window.addEventListener("load", () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 300);
            });
          <\/script>
        </body>
      </html>
    `);
    previewWindow.document.close();
  };

  /*
   * Load the event's saved key-prize list synchronously when this page
   * is created. This avoids the previous load/save effect race where the
   * initial default row could immediately overwrite saved winners.
   */
  const [keyPrizes, setKeyPrizes] =
    useState<KeyPrizeWinner[]>(() => {
      try {
        const saved = localStorage.getItem(
          prizeStorageKey(event.eventNumber)
        );

        if (saved) {
          const parsed = JSON.parse(saved);

          if (Array.isArray(parsed)) {
            return parsed.map((item) =>
              item &&
              typeof item === "object" &&
              typeof item.prize === "string" &&
              item.prize.trim().toLowerCase() === "third"
                ? { ...item, prize: "3rd Place" }
                : item
            );
          }
        }
      } catch {
        // Fall back to a fresh prize list if saved data is invalid.
      }

      return [newPrize()];
    });

  const [otherPrizes, setOtherPrizes] =
    useState<KeyPrizeWinner[]>(() => {
      try {
        const saved = localStorage.getItem(
          otherPrizeStorageKey(event.eventNumber)
        );

        if (saved) {
          const parsed = JSON.parse(saved);

          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch {
        // Fall back to no lower-significance prize rows.
      }

      return [];
    });

  const [charityInvolved, setCharityInvolved] =
    useState<boolean>(() => {
      try {
        const saved = localStorage.getItem(
          charityStorageKey(event.eventNumber)
        );

        if (saved) {
          const parsed = JSON.parse(saved);

          return Boolean(parsed?.involved);
        }
      } catch {
        // Fall back to charity not involved.
      }

      return false;
    });

  const [charityAmount, setCharityAmount] =
    useState<string>(() => {
      try {
        const saved = localStorage.getItem(
          charityStorageKey(event.eventNumber)
        );

        if (saved) {
          const parsed = JSON.parse(saved);

          return typeof parsed?.amount === "string"
            ? parsed.amount
            : "";
        }
      } catch {
        // Fall back to blank amount.
      }

      return "";
    });

  useEffect(() => {
    try {
      localStorage.setItem(
        prizeStorageKey(event.eventNumber),
        JSON.stringify(keyPrizes)
      );
    } catch {
      // Output remains usable even if storage is unavailable.
    }
  }, [event.eventNumber, keyPrizes]);

  useEffect(() => {
    try {
      localStorage.setItem(
        otherPrizeStorageKey(event.eventNumber),
        JSON.stringify(otherPrizes)
      );
    } catch {
      // Output remains usable even if storage is unavailable.
    }
  }, [event.eventNumber, otherPrizes]);

  useEffect(() => {
    try {
      localStorage.setItem(
        charityStorageKey(event.eventNumber),
        JSON.stringify({
          involved: charityInvolved,
          amount: charityAmount,
        })
      );
    } catch {
      // Output remains usable even if storage is unavailable.
    }
  }, [event.eventNumber, charityInvolved, charityAmount]);

  const updatePrize = (
    id: string,
    field: "prize" | "winner",
    value: string
  ) => {
    setKeyPrizes((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const addPrize = () => {
    setKeyPrizes((current) => [
      ...current,
      { ...newPrize(), prize: "" },
    ]);
  };

  const addOtherPrize = () => {
    setOtherPrizes((current) => [
      ...current,
      newOtherPrize(),
    ]);
  };

  const removeOtherPrize = (id: string) => {
    setOtherPrizes((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  const removePrize = (id: string) => {
    setKeyPrizes((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  const handleShare = async () => {
    const summary = [
      event.eventName || "Ramsdale Seniors Event",
      event.eventDate ? `Date: ${event.eventDate}` : "",
      event.venue ? `Venue: ${event.venue}` : "",
      event.competition ? `Competition: ${event.competition}` : "",
      event.competitionFormat ? `Format: ${event.competitionFormat}` : "",
      `Players entered: ${players.length}`,
      "",
      "Key Prize Winners",
      ...keyPrizes
        .filter((item) => item.prize.trim() || item.winner.trim())
        .map((item) => `${item.prize || "Prize"}: ${item.winner || "Not recorded"}`),
      "",
      "Other Significant Prize Winners",
      ...otherPrizes
        .filter((item) => item.prize.trim() || item.winner.trim())
        .map((item) => `${item.prize || "Prize"}: ${item.winner || "Not recorded"}`),
      charityInvolved && charityAmount.trim()
        ? `Amount raised for charity: £${Number(charityAmount).toFixed(2)}`
        : "",
    ].filter(Boolean).join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: event.eventName || "Ramsdale Seniors Event",
          text: summary,
        });
        return;
      }

      await navigator.clipboard.writeText(summary);
      window.alert(
        "The event summary has been copied to the clipboard and is ready to share."
      );
    } catch {
      // User cancellation is normal.
    }
  };

  return (
    <PageLayout title="Event Output">

      <div className="event-output-page">

        {/* OUTPUT CONTROLS */}

        <div className="event-output-controls">

          <button
            type="button"
            className="output-back-button"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Back to Review & Publish
          </button>

          <div className="output-control-actions">

            <button
              type="button"
              className="output-print-button"
              onClick={handlePrint}
            >
              <Printer size={19} />
              Print Event
            </button>

            <button
              type="button"
              className="output-pdf-button"
              onClick={handlePrint}
            >
              <Printer size={19} />
              Save as PDF
            </button>

            <button
              type="button"
              className="output-pdf-button"
              onClick={handleShare}
            >
              <Share2 size={19} />
              Share
            </button>

          </div>

        </div>

        {/* PRINTABLE DOCUMENT */}

        <div className="event-output-document">

          <div className="event-output-header">

            <div>

              <div className="event-output-brand">
                RAMSDALE SENIORS EVENT DESK
              </div>

              <h1>
                {event.eventName ||
                  "Unnamed Event"}
              </h1>

              <p className="event-output-competition">
                {event.competition ||
                  "Competition not selected"}
              </p>

            </div>

            <div className="event-output-number">
              EVENT
              <strong>
                {event.eventNumber}
              </strong>
            </div>

          </div>

          <div className="published-record-banner">

            <CheckCircle size={20} />

            <div>

              <strong>
                {archived
                  ? "Archived Event Record"
                  : published
                  ? "Official Event Summary"
                  : "Draft Event Preview"}
              </strong>

              <span>
                {archived
                  ? "This is the read-only historical event record."
                  : published
                  ? "This is the current official published event record."
                  : "Preview of the current event information before publication."}
              </span>

            </div>

          </div>

          {/* EVENT DETAILS */}

          <section className="output-section">

            <div className="output-section-heading">
              <h2>Event Details</h2>
            </div>

            <div className="output-details-grid">

              <div>
                <span>DATE</span>
                <strong>
                  {event.eventDate || "Not Set"}
                </strong>
              </div>

              <div>
                <span>VENUE</span>
                <strong>
                  {event.venue || "Not Set"}
                </strong>
              </div>

              <div>
                <span>FORMAT</span>
                <strong>
                  {event.competitionFormat || "Not Set"}
                </strong>
              </div>

              <div>
                <span>PLAYERS ENTERED</span>
                <strong>
                  {players.length}
                </strong>
              </div>

            </div>

          </section>

          {/* COMPETITION SUMMARY */}

          <section className="output-section">
            <div className="output-section-heading">
              <h2>Competition Summary</h2>
            </div>

            <div className="output-details-grid">
              <div>
                <span>ROUNDS</span>
                <strong>{event.competitionRounds || "Not Set"}</strong>
              </div>

              <div>
                <span>HANDICAP ALLOWANCE</span>
                <strong>{event.handicapAllowance ?? "Not Set"}%</strong>
              </div>

              <div>
                <span>TEE COLOUR</span>
                <strong>{event.teeColour || "Not Set"}</strong>
              </div>

              <div>
                <span>ENTRY FEE</span>
                <strong>£{event.entryFee.toFixed(2)}</strong>
              </div>
            </div>
          </section>

          {/* KEY PRIZE WINNERS */}

          <section className="output-section event-output-prize-editor">
            <div className="output-section-heading player-heading">
              <div>
                <h2>Key Prize Winners</h2>
                <p>Enter the significant prizes for this competition.</p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 40px",
                gap: "10px",
                marginBottom: "2px",
                color: "#64748b",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <span>KEY PRIZE</span>
              <span>WINNER</span>
              <span aria-hidden="true" />
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              {keyPrizes.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr auto",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    value={item.prize}
                    onChange={(e) => updatePrize(item.id, "prize", e.target.value)}
                    placeholder="Key prize"
                    aria-label="Key prize"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      border: "1px solid #dbe7f3",
                      borderRadius: "8px",
                    }}
                  />

                  <input
                    type="text"
                    value={item.winner}
                    onChange={(e) => updatePrize(item.id, "winner", e.target.value)}
                    placeholder="Winner"
                    aria-label="Winner"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      border: "1px solid #dbe7f3",
                      borderRadius: "8px",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => removePrize(item.id)}
                    aria-label={`Remove ${item.prize || "prize"}`}
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "1px solid #dbe7f3",
                      borderRadius: "8px",
                      background: "white",
                      color: "#b42318",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addPrize}
              style={{
                marginTop: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                border: "1px solid #2f6db5",
                borderRadius: "8px",
                padding: "9px 13px",
                background: "white",
                color: "#205b9f",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Plus size={16} />
              Add Key Prize
            </button>
          </section>

          {/* OTHER SIGNIFICANT PRIZES */}

          <section className="output-section event-output-other-prize-editor">
            <div className="output-section-heading player-heading">
              <div>
                <h2>Other Significant Prize Winners</h2>
                <p>Optional: add only other significant prizes you choose to record.</p>
              </div>
            </div>

            {otherPrizes.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 40px",
                  gap: "10px",
                  marginBottom: "2px",
                  color: "#64748b",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                <span>PRIZE</span>
                <span>WINNER</span>
                <span aria-hidden="true" />
              </div>
            )}

            <div style={{ display: "grid", gap: "10px" }}>
              {otherPrizes.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr auto",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    value={item.prize}
                    onChange={(e) =>
                      setOtherPrizes((current) =>
                        current.map((row) =>
                          row.id === item.id
                            ? { ...row, prize: e.target.value }
                            : row
                        )
                      )
                    }
                    placeholder="Prize"
                    aria-label="Other prize"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      border: "1px solid #dbe7f3",
                      borderRadius: "8px",
                    }}
                  />

                  <input
                    type="text"
                    value={item.winner}
                    onChange={(e) =>
                      setOtherPrizes((current) =>
                        current.map((row) =>
                          row.id === item.id
                            ? { ...row, winner: e.target.value }
                            : row
                        )
                      )
                    }
                    placeholder="Winner"
                    aria-label="Other prize winner"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      border: "1px solid #dbe7f3",
                      borderRadius: "8px",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => removeOtherPrize(item.id)}
                    aria-label={`Remove ${item.prize || "prize"}`}
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "1px solid #dbe7f3",
                      borderRadius: "8px",
                      background: "white",
                      color: "#b42318",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addOtherPrize}
              style={{
                marginTop: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                border: "1px solid #2f6db5",
                borderRadius: "8px",
                padding: "9px 13px",
                background: "white",
                color: "#205b9f",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Plus size={16} />
              Add Other Prize
            </button>
          </section>

          {/* CHARITY */}

          <section className="output-section event-output-charity-editor">
            <div className="output-section-heading player-heading">
              <div>
                <h2>Charity</h2>
                <p>Record the amount raised when charity is involved.</p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "auto minmax(220px, 1fr)",
                gap: "14px",
                alignItems: "center",
              }}
            >
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: 700,
                  color: "#24364b",
                }}
              >
                <input
                  type="checkbox"
                  checked={charityInvolved}
                  onChange={(e) =>
                    setCharityInvolved(e.target.checked)
                  }
                />
                Charity involved
              </label>

              {charityInvolved && (
                <label
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "10px",
                    alignItems: "center",
                    fontWeight: 700,
                    color: "#24364b",
                  }}
                >
                  <span>Amount raised £</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={charityAmount}
                    onChange={(e) =>
                      setCharityAmount(e.target.value)
                    }
                    placeholder="0.00"
                    aria-label="Amount raised for charity"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      border: "1px solid #dbe7f3",
                      borderRadius: "8px",
                    }}
                  />
                </label>
              )}
            </div>
          </section>

          {/* PRINT-ONLY KEY PRIZE TABLE */}

          <section className="output-section event-output-prize-print">
            <div className="output-section-heading">
              <h2>Key Prize Winners</h2>
            </div>

            {keyPrizes.filter(
              (item) =>
                item.prize.trim() !== "" ||
                item.winner.trim() !== ""
            ).length === 0 ? (
              <div className="event-output-print-empty">
                No key prize winners have been recorded.
              </div>
            ) : (
              <table className="event-output-print-prize-table">
                <thead>
                  <tr>
                    <th>KEY PRIZE</th>
                    <th>WINNER</th>
                  </tr>
                </thead>
                <tbody>
                  {keyPrizes
                    .filter(
                      (item) =>
                        item.prize.trim() !== "" ||
                        item.winner.trim() !== ""
                    )
                    .map((item) => (
                      <tr key={`print-${item.id}`}>
                        <td>{item.prize || "Prize"}</td>
                        <td>{item.winner || "Not recorded"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </section>

          {/* OUTPUT FOOTER */}

          <div className="event-output-footer">

            <div>
              Ramsdale Seniors Event Desk
            </div>

            <div>
              Event {event.eventNumber}
            </div>

          </div>

        </div>

        <style>
          {`
            .event-output-prize-print {
              display: none;
            }

            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }

              html,
              body {
                width: 210mm !important;
                min-width: 210mm !important;
                max-width: 210mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
              }

              body {
                overflow: visible !important;
              }

              body * {
                visibility: hidden !important;
              }

              .event-output-document,
              .event-output-document * {
                visibility: visible !important;
              }

              .event-output-page {
                position: static !important;
                width: 210mm !important;
                max-width: 210mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
              }

              .event-output-document {
                position: relative !important;
                left: auto !important;
                top: auto !important;
                width: 210mm !important;
                max-width: 210mm !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 12mm 13mm 11mm !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                background: #ffffff !important;
                box-sizing: border-box !important;
                color: #24364b !important;
                font-size: 13pt !important;
                line-height: 1.3 !important;
              }

              .event-output-controls,
              .event-output-prize-editor,
              .event-output-prize-editor *,
              .event-output-other-prize-editor,
              .event-output-other-prize-editor *,
              .event-output-charity-editor,
              .event-output-charity-editor *,
              .no-print {
                display: none !important;
                visibility: hidden !important;
              }

              .event-output-prize-print {
                display: block !important;
                visibility: visible !important;
              }

              .event-output-header {
                display: flex !important;
                align-items: flex-start !important;
                justify-content: space-between !important;
                gap: 12mm !important;
                padding-bottom: 7mm !important;
                margin-bottom: 7mm !important;
              }

              .event-output-brand {
                font-size: 13pt !important;
                letter-spacing: 1pt !important;
              }

              .event-output-header h1 {
                margin: 2mm 0 1mm !important;
                font-size: 29pt !important;
                line-height: 1.05 !important;
              }

              .event-output-competition {
                font-size: 13pt !important;
                margin: 0 !important;
              }

              .event-output-number {
                min-width: 24mm !important;
                padding: 4mm !important;
                font-size: 10pt !important;
              }

              .event-output-number strong {
                font-size: 21pt !important;
              }

              .published-record-banner {
                padding: 4mm 5mm !important;
                margin-bottom: 7mm !important;
              }

              .published-record-banner strong {
                font-size: 13pt !important;
              }

              .published-record-banner span {
                font-size: 12pt !important;
              }

              .output-section {
                margin: 0 0 8mm !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              .output-section-heading {
                margin-bottom: 3.5mm !important;
                padding-bottom: 2mm !important;
              }

              .output-section-heading h2 {
                font-size: 16pt !important;
                line-height: 1.1 !important;
                margin: 0 !important;
              }

              .output-details-grid {
                gap: 5mm 10mm !important;
              }

              .output-details-grid span {
                font-size: 9pt !important;
              }

              .output-details-grid strong {
                font-size: 13pt !important;
              }

              .event-output-print-prize-table {
                width: 100% !important;
                border-collapse: collapse !important;
              }

              .event-output-print-prize-table th {
                padding: 3.5mm 4mm !important;
                font-size: 9.5pt !important;
              }

              .event-output-print-prize-table td {
                padding: 3.5mm 4mm !important;
                font-size: 12pt !important;
              }

              .event-output-footer {
                margin-top: 7mm !important;
                padding-top: 3mm !important;
                font-size: 9pt !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              .event-output-page,
              .event-output-document,
              .event-output-document section,
              .event-output-footer {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          `}
        </style>

      </div>

    </PageLayout>
  );
}