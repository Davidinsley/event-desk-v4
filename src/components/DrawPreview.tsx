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

export interface DrawPreviewData {
  title: string;
  subtitle: string;
  rows?: DrawPreviewRow[];
  matches?: DrawPreviewMatch[];
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
      ...(hasBracket
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
    window.print();
  }

  return (
    <div
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

        {hasBracket ? (
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
          @media print {
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
          }
        `}
      </style>
    </div>
  );
}
