import { useEffect, useMemo, useState } from "react";
import "./Catering.css";

import type { Player } from "../types/Player";
import PageLayout from "../layout/PageLayout";
import ActionTile from "../ui/ActionTile";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Lock,
  Printer,
  RefreshCw,
  UtensilsCrossed,
  Users,
} from "lucide-react";

interface CateringProps {
  players: Player[];
}

type MealOption =
  | "Breakfast cob"
  | "Breakfast cob + Main Course"
  | "Main Course + Dessert"
  | "Starter + Main Course"
  | "Bespoke";

type EatingArrangement = "Rolling" | "Group";

interface CateringPerson {
  id: string;
  name: string;
  isPlayer: boolean;
  mealOption: MealOption | "";
  vegetarianMain: boolean;
}

interface CateringData {
  menuReference: string;
  foodChargePerPerson: number;
  additionalCharge: number;
  eatingArrangement: EatingArrangement;
  people: CateringPerson[];
}

interface EventRecordLike {
  id: string;
  event?: {
    eventDate?: string;
  };
  archived?: boolean;
}

const EVENT_RECORDS_KEY = "eventDeskEventRecords";
const ACTIVE_EVENT_ID_KEY = "eventDeskActiveEventId";

const MEAL_OPTIONS: MealOption[] = [
  "Breakfast cob",
  "Breakfast cob + Main Course",
  "Main Course + Dessert",
  "Starter + Main Course",
  "Bespoke",
];

const EMPTY_DATA: CateringData = {
  menuReference: "",
  foodChargePerPerson: 0,
  additionalCharge: 0,
  eatingArrangement: "Group",
  people: [],
};

const readActiveEvent = (): EventRecordLike | null => {
  try {
    const activeId = localStorage.getItem(ACTIVE_EVENT_ID_KEY);
    const records = JSON.parse(
      localStorage.getItem(EVENT_RECORDS_KEY) || "[]"
    ) as EventRecordLike[];

    if (!Array.isArray(records)) return null;

    return (
      records.find((record) => record.id === activeId) ||
      records[0] ||
      null
    );
  } catch {
    return null;
  }
};

const getCateringKey = () => {
  const activeEvent = readActiveEvent();
  return `eventDeskCatering:${activeEvent?.id || "default"}`;
};

const loadCatering = (): CateringData => {
  try {
    const saved = localStorage.getItem(getCateringKey());
    if (!saved) return EMPTY_DATA;

    const parsed = JSON.parse(saved) as Partial<CateringData>;

    return {
      ...EMPTY_DATA,
      ...parsed,
      people: Array.isArray(parsed.people) ? parsed.people : [],
    };
  } catch {
    return EMPTY_DATA;
  }
};

const saveCatering = (data: CateringData) => {
  try {
    localStorage.setItem(getCateringKey(), JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save catering data", error);
  }
};

const mealIncludesMain = (meal: MealOption | "") =>
  meal === "Breakfast cob + Main Course" ||
  meal === "Main Course + Dessert" ||
  meal === "Starter + Main Course";

const mealComponents = (meal: MealOption | "") => {
  switch (meal) {
    case "Breakfast cob":
      return ["Breakfast cob"];
    case "Breakfast cob + Main Course":
      return ["Breakfast cob", "Main Course"];
    case "Main Course + Dessert":
      return ["Main Course", "Dessert"];
    case "Starter + Main Course":
      return ["Starter", "Main Course"];
    case "Bespoke":
      return ["Bespoke"];
    default:
      return [];
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);

const getDaysUntilEvent = (eventDate: string) => {
  if (!eventDate) return null;

  const target = new Date(`${eventDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target.getTime() - today.getTime()) / 86400000
  );
};

const formatEventDate = (eventDate: string) => {
  if (!eventDate) return "Event date not set";

  const date = new Date(`${eventDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Event date not set";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function Catering({ players }: CateringProps) {
  const [data, setData] = useState<CateringData>(loadCatering);
  const [showKitchenReport, setShowKitchenReport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const activeEvent = readActiveEvent();
  const eventDate = activeEvent?.event?.eventDate || "";
  const daysUntilEvent = getDaysUntilEvent(eventDate);

  const locked =
    Boolean(activeEvent?.archived) ||
    (daysUntilEvent !== null && daysUntilEvent <= 14);

  const finalCateringDate =
    daysUntilEvent === null
      ? null
      : (() => {
          const date = new Date(`${eventDate}T00:00:00`);
          date.setDate(date.getDate() - 14);
          return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        })();

  useEffect(() => {
    const playerPeople: CateringPerson[] = players.map((player) => {
      const existing = data.people.find(
        (person) => person.id === player.id
      );

      return (
        existing || {
          id: player.id,
          name: `${player.firstName} ${player.lastName}`,
          isPlayer: true,
          mealOption: "",
          vegetarianMain: false,
        }
      );
    });

    const nonPlayerPeople = data.people.filter(
      (person) => !person.isPlayer
    );

    const nextPeople = [...playerPeople, ...nonPlayerPeople];

    if (
      nextPeople.length !== data.people.length ||
      nextPeople.some(
        (person, index) =>
          person.id !== data.people[index]?.id ||
          person.name !== data.people[index]?.name
      )
    ) {
      setData((current) => {
        const next = { ...current, people: nextPeople };
        saveCatering(next);
        return next;
      });
    }
    // Player register changes are intentionally reconciled here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, refreshKey]);

  const updateData = (
    updater: (current: CateringData) => CateringData
  ) => {
    if (locked) return;

    setData((current) => {
      const next = updater(current);
      saveCatering(next);
      return next;
    });
  };

  const assignedPeople = data.people.filter(
    (person) => person.mealOption
  );

  const outstanding = data.people.filter(
    (person) => !person.mealOption
  ).length;

  const vegetarianCount = data.people.filter(
    (person) =>
      person.vegetarianMain && mealIncludesMain(person.mealOption)
  ).length;

  const totalFoodCharge =
    players.length * Number(data.foodChargePerPerson || 0) +
    Number(data.additionalCharge || 0);

  const dishCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    assignedPeople.forEach((person) => {
      mealComponents(person.mealOption).forEach((component) => {
        counts[component] = (counts[component] || 0) + 1;
      });

      if (
        person.vegetarianMain &&
        mealIncludesMain(person.mealOption)
      ) {
        counts["Main Course — Vegetarian"] =
          (counts["Main Course — Vegetarian"] || 0) + 1;
        counts["Main Course"] = Math.max(
          0,
          (counts["Main Course"] || 0) - 1
        );
      }
    });

    return Object.entries(counts).filter(([, count]) => count > 0);
  }, [assignedPeople]);

  const addAttendee = () => {
    if (locked) return;

    const id = `attendee-${Date.now()}`;

    updateData((current) => ({
      ...current,
      people: [
        ...current.people,
        {
          id,
          name: "Additional attendee",
          isPlayer: false,
          mealOption: "",
          vegetarianMain: false,
        },
      ],
    }));
  };

  const removeAttendee = (id: string) => {
    if (locked) return;

    updateData((current) => ({
      ...current,
      people: current.people.filter(
        (person) => person.id !== id
      ),
    }));
  };

  const exportCsv = () => {
    const rows = [
      ["Name", "Type", "Meal Option", "Vegetarian Main"],
      ...data.people.map((person) => [
        person.name,
        person.isPlayer ? "Player" : "Eating-only attendee",
        person.mealOption || "Not selected",
        person.vegetarianMain ? "Yes" : "No",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "catering-register.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const summary = (
    <div className="page-summary catering-summary">
      <div className="summary-card">
        <div className="summary-card-title">Eating</div>
        <div className="summary-card-value">{data.people.length}</div>
      </div>

      <div className="summary-card">
        <div className="summary-card-title">Players</div>
        <div className="summary-card-value">{players.length}</div>
      </div>

      <div className="summary-card">
        <div className="summary-card-title">Vegetarian</div>
        <div className="summary-card-value">{vegetarianCount}</div>
      </div>

      <div className="summary-card">
        <div className="summary-card-title">Outstanding</div>
        <div className="summary-card-value">{outstanding}</div>
      </div>

      <div className="summary-card">
        <div className="summary-card-title">Total Food Charge</div>
        <div className="summary-card-value">
          {formatCurrency(totalFoodCharge)}
        </div>
      </div>
    </div>
  );

  const actions = (
    <div className="page-actions catering-actions">
      <ActionTile
        icon={RefreshCw}
        title="Refresh"
        primary
        onClick={() => {
          setData(loadCatering());
          setRefreshKey((value) => value + 1);
        }}
      />

      <ActionTile
        icon={UtensilsCrossed}
        title="Meal Choices"
        onClick={() => {
          setShowKitchenReport(false);
          document
            .getElementById("catering-register")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <ActionTile
        icon={FileText}
        title="Kitchen Report"
        onClick={() => setShowKitchenReport((value) => !value)}
      />

      <ActionTile
        icon={Printer}
        title="Print"
        onClick={() => window.print()}
      />

      <ActionTile
        icon={Download}
        title="Export"
        onClick={exportCsv}
      />
    </div>
  );

  return (
    <PageLayout
      title="Catering"
      subtitle="Manage food choices, eating arrangements, catering costs and the final kitchen requirement."
      summary={summary}
      actions={actions}
      footer="Catering management."
    >
      <section className="catering-card">
        <div className="catering-card-header">
          <div>
            <h2>Catering Setup</h2>
            <p>
              Players are automatically included for food. Additional
              attendees may be added where someone is attending to eat
              but is not playing.
            </p>
          </div>

          <div className="catering-status">
            {locked ? (
              <>
                <Lock size={18} />
                <span>Catering Locked</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Open for Updates</span>
              </>
            )}
          </div>
        </div>

        <div className="catering-grid">
          <label>
            <span>Menu / Food Reference</span>
            <input
              value={data.menuReference}
              disabled={locked}
              onChange={(event) =>
                updateData((current) => ({
                  ...current,
                  menuReference: event.target.value,
                }))
              }
              placeholder="e.g. Menu A / Christmas Lunch 2027"
            />
          </label>

          <label>
            <span>Food Charge per Person</span>
            <div className="currency-input">
              <span>£</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={data.foodChargePerPerson || ""}
                disabled={locked}
                onChange={(event) =>
                  updateData((current) => ({
                    ...current,
                    foodChargePerPerson:
                      Number(event.target.value) || 0,
                  }))
                }
                placeholder="0.00"
              />
            </div>
          </label>

          <label>
            <span>Additional Catering Charge</span>
            <div className="currency-input">
              <span>£</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={data.additionalCharge || ""}
                disabled={locked}
                onChange={(event) =>
                  updateData((current) => ({
                    ...current,
                    additionalCharge:
                      Number(event.target.value) || 0,
                  }))
                }
                placeholder="0.00"
              />
            </div>
          </label>

          <label>
            <span>Eating Arrangement</span>
            <select
              value={data.eatingArrangement}
              disabled={locked}
              onChange={(event) =>
                updateData((current) => ({
                  ...current,
                  eatingArrangement:
                    event.target.value as EatingArrangement,
                }))
              }
            >
              <option value="Group">Group</option>
              <option value="Rolling">Rolling</option>
            </select>
          </label>
        </div>

        <div className="catering-calculation">
          <div>
            <span>Players × Food Charge</span>
            <strong>
              {players.length} ×{" "}
              {formatCurrency(data.foodChargePerPerson)}
            </strong>
          </div>

          <div>
            <span>Additional Charge</span>
            <strong>
              {formatCurrency(data.additionalCharge)}
            </strong>
          </div>

          <div className="calculation-total">
            <span>Total Event Food Charge</span>
            <strong>{formatCurrency(totalFoodCharge)}</strong>
          </div>
        </div>
      </section>

      <section className="catering-deadline-card">
        <div className="deadline-icon">
          {locked ? <Lock size={22} /> : <AlertCircle size={22} />}
        </div>

        <div>
          <h3>
            {locked
              ? "Final Catering Numbers Locked"
              : "Catering Finalisation"}
          </h3>

          {eventDate ? (
            <p>
              Event date: <strong>{formatEventDate(eventDate)}</strong>.
              Final catering entries lock 14 days before the event
              {finalCateringDate
                ? ` (${finalCateringDate})`
                : ""}.
            </p>
          ) : (
            <p>
              Set the event date to activate the 14-day catering
              lock.
            </p>
          )}

          <p className="deadline-note">
            Notify the catering team of the final number of diners and
            the confirmed food choices before the lock date.
          </p>
        </div>
      </section>

      {showKitchenReport && (
        <section className="catering-card kitchen-report">
          <div className="catering-card-header">
            <div>
              <h2>Kitchen Report</h2>
              <p>
                Required dish quantities from the current catering
                register.
              </p>
            </div>
          </div>

          {dishCounts.length === 0 ? (
            <div className="empty-state">
              No meal choices have been assigned yet.
            </div>
          ) : (
            <div className="dish-grid">
              {dishCounts.map(([dish, count]) => (
                <div className="dish-row" key={dish}>
                  <span>{dish}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section
        className="catering-card"
        id="catering-register"
      >
        <div className="catering-card-header">
          <div>
            <h2>Eating Register</h2>
            <p>
              Select one food option for every diner. Players do not
              have a food opt-out.
            </p>
          </div>

          <button
            type="button"
            className="add-attendee-button"
            disabled={locked}
            onClick={addAttendee}
          >
            <Users size={18} />
            Add Eating-Only Attendee
          </button>
        </div>

        <div className="catering-table-wrap">
          <table className="catering-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Food Option</th>
                <th>Vegetarian Main</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {data.people.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No players are currently registered. Add players
                    in the Players section.
                  </td>
                </tr>
              ) : (
                data.people.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <strong>{person.name}</strong>
                    </td>

                    <td>
                      <span
                        className={
                          person.isPlayer
                            ? "person-badge"
                            : "person-badge attendee"
                        }
                      >
                        {person.isPlayer
                          ? "Player"
                          : "Eating only"}
                      </span>
                    </td>

                    <td>
                      <select
                        value={person.mealOption}
                        disabled={locked}
                        onChange={(event) => {
                          const meal =
                            event.target.value as MealOption | "";

                          updateData((current) => ({
                            ...current,
                            people: current.people.map(
                              (item) =>
                                item.id === person.id
                                  ? {
                                      ...item,
                                      mealOption: meal,
                                      vegetarianMain:
                                        mealIncludesMain(meal)
                                          ? item.vegetarianMain
                                          : false,
                                    }
                                  : item
                            ),
                          }));
                        }}
                      >
                        <option value="">
                          Select food option
                        </option>
                        {MEAL_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      {mealIncludesMain(person.mealOption) ? (
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={person.vegetarianMain}
                            disabled={locked}
                            onChange={(event) =>
                              updateData((current) => ({
                                ...current,
                                people: current.people.map(
                                  (item) =>
                                    item.id === person.id
                                      ? {
                                          ...item,
                                          vegetarianMain:
                                            event.target.checked,
                                        }
                                      : item
                                ),
                              }))
                            }
                          />
                          Vegetarian
                        </label>
                      ) : (
                        <span className="not-applicable">—</span>
                      )}
                    </td>

                    <td className="remove-cell">
                      {!person.isPlayer && (
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => removeAttendee(person.id)}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="catering-card catering-notes">
        <div className="note-icon">
          <AlertCircle size={20} />
        </div>
        <div>
          <h3>Final Catering Instruction</h3>
          <p>
            Before the 14-day lock, check that every player and
            eating-only attendee has a food option selected. Then
            provide the catering team with the final diner count,
            eating arrangement, menu reference and kitchen dish
            quantities.
          </p>
        </div>
      </section>
    </PageLayout>
  );
}
