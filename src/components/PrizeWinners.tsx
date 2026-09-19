// PrizeWinners.tsx — Prize winners entry and publication preview

import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Event, EventPrize, PrizeStream } from "../types/Event";
import "./PrizeWinners.css";

interface PrizeWinnersProps {
  event: Event;
  setEvent: Dispatch<SetStateAction<Event>>;
}

interface WinnerSection {
  stream: PrizeStream;
  number: number;
  title: string;
}

const sections: WinnerSection[] = [
  { stream: "main", number: 1, title: "Overall Competition Prizes" },
  { stream: "additional", number: 2, title: "Additional Competition Prizes" },
  { stream: "onCourse", number: 3, title: "On-Course Prizes" },
  { stream: "special", number: 4, title: "Special Event Prizes" },
];

const DEFAULT_MESSAGE =
  "Congratulations to all our prize winners, and thank you to everyone who took part and helped make the event such an enjoyable occasion.";

export default function PrizeWinners({
  event,
  setEvent,
}: PrizeWinnersProps) {
  const prizes = event.prizes ?? [];

  const useBespokeMessage =
    event.prizeWinnersUseBespokeMessage ?? false;

  const bespokeMessage =
    event.prizeWinnersPublicationMessage ?? DEFAULT_MESSAGE;

  const publicationMessage =
    useBespokeMessage && bespokeMessage.trim()
      ? bespokeMessage.trim()
      : DEFAULT_MESSAGE;

  const setUseBespokeMessage = (checked: boolean) => {
    setEvent((current) => ({
      ...current,
      prizeWinnersUseBespokeMessage: checked,
      prizeWinnersPublicationMessage:
        current.prizeWinnersPublicationMessage?.trim()
          ? current.prizeWinnersPublicationMessage
          : DEFAULT_MESSAGE,
    }));
  };

  const setBespokeMessage = (message: string) => {
    setEvent((current) => ({
      ...current,
      prizeWinnersPublicationMessage: message,
    }));
  };

  const completedWinners = useMemo(
    () => prizes.filter((prize) => prize.winner?.trim()).length,
    [prizes]
  );

  const updateWinner = (id: string, winner: string) => {
    const nextPrizes: EventPrize[] = prizes.map((prize) =>
      prize.id === id ? { ...prize, winner } : prize
    );

    setEvent((current) => ({
      ...current,
      prizes: nextPrizes,
    }));
  };

  const printPublication = () => {
    const publishedSections = sections
      .map((section) => ({
        ...section,
        prizes: prizes.filter(
          (prize) => prize.stream === section.stream && prize.winner?.trim()
        ),
      }))
      .filter((section) => section.prizes.length > 0);

    if (publishedSections.length === 0) {
      window.alert(
        "Enter at least one winner before creating the Prize Winners publication."
      );
      return;
    }

    const esc = (value: string) =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const eventName = esc(event.eventName || "Event");
    const eventDate = event.eventDate
      ? new Date(`${event.eventDate}T12:00:00`).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

    const sectionsHtml = publishedSections
      .map(
        (section) => `
          <section class="winner-publication-section">
            <h2>${esc(section.title)}</h2>
            <table>
              <thead>
                <tr>
                  <th>Prize / Competition</th>
                  <th>Prize</th>
                  <th>Winner(s)</th>
                </tr>
              </thead>
              <tbody>
                ${section.prizes
                  .map(
                    (prize) => `
                      <tr>
                        <td>${esc(prize.title || "Prize")}</td>
                        <td>${esc(prize.description || "—")}</td>
                        <td class="winner-name">${esc(prize.winner?.trim() || "")}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </section>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=980,height=800");

    if (!printWindow) {
      window.alert(
        "The print window could not be opened. Please allow pop-ups and try again."
      );
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${eventName} - Prize Winners</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 14mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #24364b;
              background: white;
            }

            .publication {
              max-width: 760px;
              margin: 0 auto;
            }

            .publication-header {
              text-align: center;
              border-bottom: 3px solid #2c69ad;
              padding-bottom: 14px;
              margin-bottom: 18px;
            }

            .club {
              color: #2c69ad;
              font-size: 14px;
              font-weight: 800;
              letter-spacing: .04em;
              text-transform: uppercase;
            }

            h1 {
              margin: 8px 0 3px;
              color: #183f70;
              font-size: 28px;
            }

            .publication-title {
              color: #b48624;
              font-size: 20px;
              font-weight: 800;
            }

            .event-date {
              margin-top: 6px;
              color: #65758a;
              font-size: 12px;
            }

            .message {
              margin: 0 0 22px;
              padding: 14px 18px;
              border-radius: 8px;
              background: #f4f8fc;
              color: #3c536c;
              font-size: 13px;
              line-height: 1.5;
              text-align: center;
            }

            .winner-publication-section {
              margin: 0 0 20px;
              break-inside: avoid;
            }

            .winner-publication-section h2 {
              margin: 0 0 7px;
              padding: 7px 9px;
              border-left: 5px solid #2c69ad;
              background: #edf5fc;
              color: #214f83;
              font-size: 15px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }

            th,
            td {
              padding: 7px 8px;
              border-bottom: 1px solid #dbe3eb;
              text-align: left;
              vertical-align: top;
            }

            th {
              color: #52667c;
              background: #f8fafc;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: .03em;
            }

            .winner-name {
              color: #173f70;
              font-weight: 800;
            }

            .print-actions {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 14px;
            }

            .print-actions button {
              border: 0;
              border-radius: 7px;
              padding: 9px 14px;
              background: #2c69ad;
              color: white;
              font-weight: 700;
              cursor: pointer;
            }

            @media print {
              .print-actions {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="publication">
            <div class="print-actions">
              <button onclick="window.print()">Print / Save as PDF</button>
            </div>

            <header class="publication-header">
              <div class="club">Ramsdale Park Golf Club — Seniors Section</div>
              <h1>${eventName}</h1>
              <div class="publication-title">Prize Winners</div>
              ${eventDate ? `<div class="event-date">${esc(eventDate)}</div>` : ""}
            </header>

            <div class="message">${esc(publicationMessage)}</div>

            ${sectionsHtml}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="prize-winners-page">
      <div className="prize-winners-heading">
        <div>
          <h1>Prize Winners</h1>
          <p>
            Enter the winner or winners for each prize. The prize structure is
            automatically taken from the Prizes page.
          </p>
        </div>

        <div className="prize-winners-progress">
          <strong>{completedWinners}</strong>
          <span>of {prizes.length} winners entered</span>
        </div>
      </div>

      <section className="publication-message-card">
        <div className="publication-message-heading">
          <div>
            <h2>Publication Message</h2>
            <p>
              The standard congratulations message will be used unless you
              choose to replace it.
            </p>
          </div>

          <label className="bespoke-message-toggle">
            <input
              type="checkbox"
              checked={useBespokeMessage}
              onChange={(e) =>
                setUseBespokeMessage(e.target.checked)
              }
            />
            <span>Use a bespoke publication message</span>
          </label>
        </div>

        {!useBespokeMessage ? (
          <div className="default-publication-message">
            {DEFAULT_MESSAGE}
          </div>
        ) : (
          <textarea
            className="bespoke-message-box"
            value={bespokeMessage}
            onChange={(e) => setBespokeMessage(e.target.value)}
            rows={4}
            placeholder="Enter the message to appear on the Prize Winners publication..."
          />
        )}
      </section>

      {prizes.length === 0 ? (
        <div className="prize-winners-empty">
          <h2>No prizes have been set up yet</h2>
          <p>
            Add prizes on the Prizes page first. They will then appear here
            automatically.
          </p>
        </div>
      ) : (
        <div className="winner-sections">
          {sections.map((section) => {
            const entries = prizes.filter(
              (prize) => prize.stream === section.stream
            );

            if (entries.length === 0) return null;

            return (
              <section
                className={`winner-section winner-section-${section.stream}`}
                key={section.stream}
              >
                <div className="winner-section-heading">
                  <div className="winner-section-number">{section.number}</div>
                  <div>
                    <h2>{section.title}</h2>
                    <p>
                      {entries.length} {entries.length === 1 ? "prize" : "prizes"}
                    </p>
                  </div>
                </div>

                <div className="winner-list">
                  {entries.map((prize, index) => (
                    <div className="winner-row" key={prize.id}>
                      <div className="winner-row-number">{index + 1}</div>

                      <div className="winner-prize">
                        <strong>{prize.title || "Prize"}</strong>
                        <span>{prize.description || "No prize description"}</span>
                      </div>

                      {prize.hole?.trim() && (
                        <div className="winner-hole">
                          Hole <strong>{prize.hole}</strong>
                        </div>
                      )}

                      <label className="winner-entry">
                        <span>Winner(s)</span>
                        <input
                          type="text"
                          value={prize.winner ?? ""}
                          placeholder="Enter individual, pair or team"
                          onChange={(e) =>
                            updateWinner(prize.id, e.target.value)
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="prize-winners-footer">
        <div>
          <strong>Publication</strong>
          <span>
            Only prizes with a winner entered will appear in the published list.
          </span>
        </div>

        <button
          type="button"
          className="prize-winners-publication-button"
          onClick={printPublication}
        >
          Preview / Print Prize Winners
        </button>
      </div>
    </div>
  );
}
