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
    if (prize.source === "Section") return "Section";
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
                              <span>Prize / Position</span>
                              <input
                                type="text"
                                value={prize.title}
                                placeholder={
                                  section.stream === "main"
                                    ? "e.g. 1st Place"
                                    : section.stream === "onCourse"
                                    ? "e.g. Nearest the Pin"
                                    : section.stream === "special"
                                    ? "e.g. Beat the Pro"
                                    : "e.g. Best Individual Man"
                                }
                                onChange={(e) =>
                                  updatePrize(prize.id, "title", e.target.value)
                                }
                              />
                            </label>

                            <label className="prize-editor-description">
                              <span>Prize Description</span>
                              <input
                                type="text"
                                value={prize.description}
                                placeholder="e.g. £50 Pro Shop voucher"
                                onChange={(e) =>
                                  updatePrize(
                                    prize.id,
                                    "description",
                                    e.target.value
                                  )
                                }
                              />
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
                                <option value="Sponsor">Sponsor</option>
                                <option value="Donation">Donation</option>
                              </select>
                            </label>

                            {prize.source !== "Section" && (
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
                              <label className="prize-editor-hole">
                                <span>Hole</span>
                                <input
                                  type="text"
                                  value={prize.hole ?? ""}
                                  placeholder="e.g. 6"
                                  onChange={(e) =>
                                    updatePrize(prize.id, "hole", e.target.value)
                                  }
                                />
                              </label>
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

      <div className="prizes-overall-total">
        <span>Total Value of All Prizes</span>
        <strong>£{overallPrizeTotal.toFixed(2)}</strong>
      </div>
    </div>
  );
}
