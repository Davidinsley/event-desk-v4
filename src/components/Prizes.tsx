// Prizes.tsx — Four-panel Event Desk prize management

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  Event,
  EventPrize,
  PrizeSource,
  PrizeStream,
} from "../types/Event";
import "./Prizes.css";

interface PrizesProps {
  event: Event;
  setEvent: Dispatch<SetStateAction<Event>>;
}

interface PrizeSection {
  stream: PrizeStream;
  number: number;
  title: string;
  shortDescription: string;
  addLabel: string;
}

const sections: PrizeSection[] = [
  {
    stream: "main",
    number: 1,
    title: "Overall Competition Prizes",
    shortDescription: "Main competition placings — add as many positions as required.",
    addLabel: "Add Main Prize",
  },
  {
    stream: "additional",
    number: 2,
    title: "Additional Competition Prizes",
    shortDescription: "Best individual and other additional competition awards.",
    addLabel: "Add Prize",
  },
  {
    stream: "onCourse",
    number: 3,
    title: "On-Course Prizes",
    shortDescription: "NTP, Longest Drive, Nearest the Line and other course prizes.",
    addLabel: "Add Course Prize",
  },
  {
    stream: "special",
    number: 4,
    title: "Special Event Prizes",
    shortDescription: "e.g. Beat the Pro and other special event prizes.",
    addLabel: "Add Special Prize",
  },
];

const createPrizeId = () =>
  `prize-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function Prizes({ event, setEvent }: PrizesProps) {
  const prizes = event.prizes ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);

  const updatePrizes = (next: EventPrize[]) => {
    setEvent((current) => ({ ...current, prizes: next }));
  };

  const addPrize = (stream: PrizeStream) => {
    const newPrize: EventPrize = {
      id: createPrizeId(),
      stream,
      title: "",
      description: "",
      source: "Section",
      sourceName: "",
      value: undefined,
      hole: "",
      winner: "",
    };

    updatePrizes([...prizes, newPrize]);
    setEditingId(newPrize.id);
  };

  const updatePrize = <K extends keyof EventPrize>(
    id: string,
    field: K,
    value: EventPrize[K]
  ) => {
    updatePrizes(
      prizes.map((prize) =>
        prize.id === id ? { ...prize, [field]: value } : prize
      )
    );
  };

  const deletePrize = (prize: EventPrize) => {
    const label = prize.title.trim() || prize.description.trim() || "this prize";
    if (!window.confirm(`Delete ${label}?\n\nThis prize will be removed from the event.`)) {
      return;
    }

    updatePrizes(prizes.filter((item) => item.id !== prize.id));
    if (editingId === prize.id) setEditingId(null);
  };

  const sourceText = (prize: EventPrize) => {
    if (prize.source === "Section" || prize.source === "Comp Fees") {
      return prize.source;
    }
    const name = prize.sourceName?.trim();
    return name ? `${prize.source}: ${name}` : prize.source;
  };

  const valueText = (prize: EventPrize) =>
    typeof prize.value === "number" && Number.isFinite(prize.value)
      ? `£${prize.value.toFixed(2)}`
      : "";

  const prizeTotal = (items: EventPrize[]) =>
    items.reduce(
      (total, prize) =>
        total +
        (typeof prize.value === "number" && Number.isFinite(prize.value)
          ? prize.value
          : 0),
      0
    );

  const overallPrizeTotal = prizeTotal(prizes);

  return (
    <div className="prizes-page">
      <div className="prizes-heading">
        <div>
          <h1>Prizes</h1>
          <p>Plan and record all prizes for this event.</p>
        </div>

      </div>

      <div className="prizes-grid">
        {sections.map((section) => {
          const entries = prizes.filter((prize) => prize.stream === section.stream);

          return (
            <section
              key={section.stream}
              className={`prize-panel prize-panel-${section.stream}`}
            >
              <div className="prize-panel-heading">
                <div className="prize-panel-number">{section.number}</div>
                <div className="prize-panel-heading-text">
                  <h2>{section.title}</h2>
                  <p>{section.shortDescription}</p>
                </div>
              </div>

              <div className="prize-panel-actions">
                <button
                  type="button"
                  className="prize-add-button"
                  onClick={() => addPrize(section.stream)}
                >
                  + {section.addLabel}
                </button>
              </div>

              {entries.length === 0 ? (
                <div className="prize-empty">No prizes added yet.</div>
              ) : (
                <div className="prize-rows">
                  {entries.map((prize, index) => {
                    const editing = editingId === prize.id;

                    return (
                      <div className="prize-entry" key={prize.id}>
                        <div className="prize-summary-row">
                          <div className="prize-summary-number">{index + 1}</div>

                          <div className="prize-summary-main">
                            <strong>
                              {prize.title.trim() || "New prize"}
                            </strong>
                            <span>
                              {prize.description.trim() || "Prize description not entered"}
                            </span>
                          </div>

                          <div className="prize-summary-source">
                            {sourceText(prize)}
                          </div>

                          <div className="prize-summary-value">
                            {valueText(prize)}
                          </div>

                          <button
                            type="button"
                            className="prize-edit-button"
                            onClick={() =>
                              setEditingId(editing ? null : prize.id)
                            }
                          >
                            {editing ? "Close" : "Edit"}
                          </button>
                        </div>

                        {editing && (
                          <div className="prize-editor">
                            <label>
                              <span>{section.stream === "onCourse" ? "Mini Comp" : "Prize / Position"}</span>
                              {section.stream === "main" ? (
                                <select
                                  value={prize.title}
                                  onChange={(e) =>
                                    updatePrize(prize.id, "title", e.target.value)
                                  }
                                >
                                  <option value="">Select...</option>
                                  <option value="Winner/s">Winner/s</option>
                                  <option value="2nd Place">2nd Place</option>
                                  <option value="3rd Place">3rd Place</option>
                                  <option value="4th Place">4th Place</option>
                                  <option value="5th Place">5th Place</option>
                                  <option value="6th Place">6th Place</option>
                                  <option value="7th Place">7th Place</option>
                                  <option value="8th Place">8th Place</option>
                                  <option value="9th Place">9th Place</option>
                                  <option value="10th Place">10th Place</option>
                                </select>
                              ) : section.stream === "onCourse" ? (
                                <select
                                  value={
                                    ["Nearest the Pin", "Longest Drive", "Nearest the Line"].includes(
                                      prize.title.split(" - ")[0]
                                    )
                                      ? prize.title.split(" - ")[0]
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const category = prize.title.split(" - ")[1] ?? "";
                                    const miniComp = e.target.value;
                                    updatePrize(
                                      prize.id,
                                      "title",
                                      miniComp
                                        ? category
                                          ? `${miniComp} - ${category}`
                                          : miniComp
                                        : ""
                                    );
                                  }}
                                >
                                  <option value="">Select...</option>
                                  <option value="Nearest the Pin">Nearest the Pin</option>
                                  <option value="Longest Drive">Longest Drive</option>
                                  <option value="Nearest the Line">Nearest the Line</option>
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={prize.title}
                                  placeholder={
                                    section.stream === "special"
                                      ? "e.g. Beat the Pro"
                                      : "e.g. Best Individual Man"
                                  }
                                  onChange={(e) =>
                                    updatePrize(prize.id, "title", e.target.value)
                                  }
                                />
                              )}
                            </label>

                            <label className="prize-editor-description">
                              <span>Prize Description</span>
                              <select
                                value={
                                  [
                                    "",
                                    "Sleeve of Balls",
                                    "Box of Balls",
                                    "Pro Shop Voucher",
                                    "Club Voucher",
                                    "Cash",
                                    "Four Ball Voucher",
                                    "Bottle of Wine",
                                    "Bottle of Spirit",
                                  ].includes(prize.description)
                                    ? prize.description
                                    : "Other"
                                }
                                onChange={(e) =>
                                  updatePrize(
                                    prize.id,
                                    "description",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">Select...</option>
                                <option value="Sleeve of Balls">Sleeve of Balls</option>
                                <option value="Box of Balls">Box of Balls</option>
                                <option value="Pro Shop Voucher">Pro Shop Voucher</option>
                                <option value="Club Voucher">Club Voucher</option>
                                <option value="Cash">Cash</option>
                                <option value="Four Ball Voucher">Four Ball Voucher</option>
                                <option value="Bottle of Wine">Bottle of Wine</option>
                                <option value="Bottle of Spirit">Bottle of Spirit</option>
                                <option value="Other">Other</option>
                              </select>

                              {prize.description === "Other" && (
                                <input
                                  type="text"
                                  value=""
                                  placeholder="Enter other prize description"
                                  onChange={(e) =>
                                    updatePrize(
                                      prize.id,
                                      "description",
                                      e.target.value
                                    )
                                  }
                                />
                              )}

                              {prize.description !== "" &&
                                prize.description !== "Other" &&
                                ![
                                  "Sleeve of Balls",
                                  "Box of Balls",
                                  "Pro Shop Voucher",
                                  "Club Voucher",
                                  "Cash",
                                  "Four Ball Voucher",
                                  "Bottle of Wine",
                                  "Bottle of Spirit",
                                ].includes(prize.description) && (
                                  <input
                                    type="text"
                                    value={prize.description}
                                    placeholder="Enter other prize description"
                                    onChange={(e) =>
                                      updatePrize(
                                        prize.id,
                                        "description",
                                        e.target.value
                                      )
                                    }
                                  />
                                )}
                            </label>

                            <label>
                              <span>Value (£)</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={prize.value ?? ""}
                                placeholder="0.00"
                                onChange={(e) =>
                                  updatePrize(
                                    prize.id,
                                    "value",
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value)
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Prize Source</span>
                              <select
                                value={prize.source}
                                onChange={(e) =>
                                  updatePrize(
                                    prize.id,
                                    "source",
                                    e.target.value as PrizeSource
                                  )
                                }
                              >
                                <option value="Section">Section</option>
                                <option value="Comp Fees">Comp Fees</option>
                                <option value="Sponsor">Sponsor</option>
                                <option value="Donation">Donation</option>
                              </select>
                            </label>

                            {(prize.source === "Sponsor" ||
                              prize.source === "Donation") && (
                              <label>
                                <span>
                                  {prize.source === "Sponsor"
                                    ? "Sponsor Name"
                                    : "Donor Name"}
                                </span>
                                <input
                                  type="text"
                                  value={prize.sourceName ?? ""}
                                  onChange={(e) =>
                                    updatePrize(
                                      prize.id,
                                      "sourceName",
                                      e.target.value
                                    )
                                  }
                                />
                              </label>
                            )}

                            {section.stream === "onCourse" && (
                              <>
                                <label>
                                  <span>Category</span>
                                  <select
                                    value={prize.title.split(" - ")[1] ?? ""}
                                    onChange={(e) => {
                                      const miniComp = prize.title.split(" - ")[0] ?? "";
                                      const category = e.target.value;
                                      updatePrize(
                                        prize.id,
                                        "title",
                                        miniComp
                                          ? category
                                            ? `${miniComp} - ${category}`
                                            : miniComp
                                          : ""
                                      );
                                    }}
                                  >
                                    <option value="">Select...</option>
                                    <option value="Men">Men</option>
                                    <option value="Ladies">Ladies</option>
                                    <option value="Mixed">Mixed</option>
                                  </select>
                                </label>

                                <label className="prize-editor-hole">
                                  <span>Hole</span>
                                  <select
                                    value={prize.hole ?? ""}
                                    onChange={(e) =>
                                      updatePrize(prize.id, "hole", e.target.value)
                                    }
                                  >
                                    <option value="">Select...</option>
                                    {Array.from({ length: 18 }, (_, index) => {
                                      const hole = String(index + 1);
                                      return (
                                        <option key={hole} value={hole}>
                                          {hole}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </label>
                              </>
                            )}

                            <div className="prize-editor-actions">
                              <button
                                type="button"
                                className="prize-delete-button"
                                onClick={() => deletePrize(prize)}
                              >
                                🗑 Delete Prize
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="prize-panel-total">
                <span>Panel Prize Value</span>
                <strong>£{prizeTotal(entries).toFixed(2)}</strong>
              </div>
            </section>
          );
        })}
      </div>

      <div
        className="prizes-overall-total"
        style={{ justifyContent: "flex-start" }}
      >
        <button
          type="button"
          className="prize-add-button"
          onClick={() => {
            const reportWindow = window.open("", "_blank", "width=1000,height=800");
            if (!reportWindow) {
              window.alert("The Prize Liability Report could not be opened.");
              return;
            }

            const escapeHtml = (value: string) =>
              value
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

            const eventTitle =
              event.eventName?.trim() ||
              (event as Event & { title?: string }).title?.trim() ||
              "Event";
            const eventDate = (event as Event & { date?: string }).date?.trim() || "";

            const sectionHtml = sections.map((section) => {
              const entries = prizes.filter((prize) => prize.stream === section.stream);
              const subtotal = prizeTotal(entries);

              const rows = entries.length === 0
                ? `<tr><td colspan="6" class="empty">No prizes recorded.</td></tr>`
                : entries.map((prize, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${escapeHtml(prize.title.trim() || "Prize")}</td>
                      <td>${escapeHtml(prize.description.trim() || "—")}</td>
                      <td>${escapeHtml(sourceText(prize) || "—")}</td>
                      <td>${escapeHtml(section.stream === "onCourse" ? prize.hole?.trim() || "—" : "—")}</td>
                      <td class="money">${escapeHtml(valueText(prize) || "£0.00")}</td>
                    </tr>`).join("");

              return `
                <section class="report-section">
                  <h2>${section.number}. ${escapeHtml(section.title)}</h2>
                  <table>
                    <thead><tr>
                      <th>No.</th><th>Prize / Competition</th><th>Prize Description</th>
                      <th>Source</th><th>Hole</th><th class="money">Value</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                  </table>
                  <div class="subtotal"><span>Section Total</span><strong>£${subtotal.toFixed(2)}</strong></div>
                </section>`;
            }).join("");

            reportWindow.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(eventTitle)} - Prize Liability Report</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
* { box-sizing: border-box; }
body { margin:0; font-family:Arial,Helvetica,sans-serif; color:#173b67; background:#fff; font-size:11px; }
.toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.toolbar button { border:1px solid #2f75bb; background:#fff; color:#1d5f9f; border-radius:7px; padding:8px 14px; font-weight:700; cursor:pointer; }
.report-header { border-bottom:3px solid #2f75bb; padding-bottom:10px; margin-bottom:16px; }
.report-header h1 { margin:0 0 5px; font-size:24px; color:#164f8b; }
.report-header h3 { margin:0 0 5px; font-size:16px; color:#222; }
.report-header p { margin:0 0 3px; color:#5d6f82; }
.report-section { margin:0 0 16px; break-inside:avoid; }
.report-section h2 { margin:0 0 6px; padding:6px 8px; font-size:14px; background:#eef6fd; border:1px solid #cfe1f2; border-radius:5px 5px 0 0; }
table { width:100%; border-collapse:collapse; table-layout:fixed; }
th,td { border:1px solid #d8e1ea; padding:5px 6px; vertical-align:top; overflow-wrap:anywhere; }
th { background:#f5f8fb; text-align:left; font-size:10px; }
th:nth-child(1),td:nth-child(1){width:6%;text-align:center}
th:nth-child(2),td:nth-child(2){width:26%}
th:nth-child(3),td:nth-child(3){width:23%}
th:nth-child(4),td:nth-child(4){width:20%}
th:nth-child(5),td:nth-child(5){width:9%;text-align:center}
th:nth-child(6),td:nth-child(6){width:16%}
.money{text-align:right;white-space:nowrap}
.empty{text-align:center;color:#7c8996;font-style:italic}
.subtotal{display:flex;justify-content:flex-end;gap:20px;padding:6px 8px;border:1px solid #d8e1ea;border-top:0}
.grand-total{margin-top:18px;padding:12px 14px;border:2px solid #2f75bb;border-radius:7px;display:flex;justify-content:space-between;align-items:center;font-size:17px;font-weight:700;break-inside:avoid}
@media print {
  .toolbar{display:none!important}
  body{font-size:10px}
  .report-section{break-inside:auto}
  thead{display:table-header-group}
  tr{break-inside:avoid}
}
</style>
</head>
<body>
<div class="toolbar"><button onclick="window.close()">← Back to Prizes</button><button onclick="window.print()">Print / Save as PDF</button></div>
<header class="report-header">
  <h1>Ramsdale Seniors Event Desk</h1>
  <h3>${escapeHtml(eventTitle)}</h3>
  ${eventDate ? `<p>${escapeHtml(eventDate)}</p>` : ""}
  <p><strong>Prize Liability Report</strong></p>
</header>
${sectionHtml}
<div class="grand-total"><span>Total Prize Liability</span><span>£${overallPrizeTotal.toFixed(2)}</span></div>
</body>
</html>`);
            reportWindow.document.close();
          }}
        >
          🖨 Print / Export Prize Report
        </button>
        <span style={{ marginLeft: "auto" }}>Total Value of All Prizes</span>
        <strong>£{overallPrizeTotal.toFixed(2)}</strong>
      </div>
    </div>
  );
}
