import { useMemo, useRef, useState } from "react";
import "./RegularCompetitions.css";

export type RegularCompetitionType =
  | "medal"
  | "stableford"
  | "medalAggregate"
  | "stablefordAggregate"
  | "addNew";

export interface RegularCompetitionRecord {
  id: string;
  eventNumber: string;
  eventName: string;
  eventDate: string;
  status: "Draft" | "Published";
}

interface RegularCompetitionsProps {
  onBack: () => void;
  onCreate: (type: RegularCompetitionType, eventDate?: string) => void;
  currentCompetitions: RegularCompetitionRecord[];
  onOpenCompetition: (id: string) => void;
  onDeleteCompetition: (id: string) => void;
}

const templates: Array<{
  type: RegularCompetitionType;
  number: string;
  title: string;
  description: string;
}> = [
  {
    type: "medal",
    number: "1",
    title: "Monday Club Medal",
    description: "Standard Monday Club Medal competition.",
  },
  {
    type: "stableford",
    number: "2",
    title: "Monday Club Stableford",
    description: "Standard Monday Club Stableford competition.",
  },
  {
    type: "medalAggregate",
    number: "3",
    title: "Monthly Medal Aggregate",
    description: "Monthly Medal aggregate template.",
  },
  {
    type: "stablefordAggregate",
    number: "4",
    title: "Monthly Stableford Aggregate",
    description: "Monthly Stableford aggregate template.",
  },
  {
    type: "addNew",
    number: "+",
    title: "Add New",
    description: "Add another reusable regular competition template.",
  },
];

const parseCompetitionDate = (
  dateValue: string,
): { weekday: string; formattedDate: string } | null => {
  const match = dateValue.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return {
    weekday: date.toLocaleDateString("en-GB", {
      weekday: "long",
    }),
    formattedDate: `${String(day).padStart(2, "0")}/${String(month).padStart(
      2,
      "0",
    )}/${year}`,
  };
};

function RegularCompetitions({
  onBack,
  onCreate,
  currentCompetitions,
  onOpenCompetition,
  onDeleteCompetition,
}: RegularCompetitionsProps) {
  const [selectedType, setSelectedType] =
    useState<RegularCompetitionType | null>(null);
  const [eventDate, setEventDate] = useState("");
  const createPanelRef = useRef<HTMLDivElement | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.type === selectedType) ?? null,
    [selectedType],
  );

  const parsedDate = useMemo(
    () => parseCompetitionDate(eventDate),
    [eventDate],
  );
  const weekday = parsedDate?.weekday ?? null;

  const handleTemplateClick = (type: RegularCompetitionType) => {
    if (type === "addNew") {
      return;
    }

    setSelectedType(type);
    setEventDate("");

    window.setTimeout(() => {
      createPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 0);
  };

  const handleCancel = () => {
    setSelectedType(null);
    setEventDate("");
  };

  const handleCreate = () => {
    if (
      selectedType === null ||
      selectedType === "addNew" ||
      !weekday
    ) {
      return;
    }

    onCreate(selectedType, parsedDate!.formattedDate);
  };

  return (
    <section className="regular-competitions-screen">
      <div className="regular-competitions-header">
        <div>
          <div className="regular-competitions-kicker">MONDAY CLUB</div>
          <h1>Regular Comp Templates</h1>
          <p>Quick access to standard Monday Club competition templates.</p>
        </div>

        <button
          type="button"
          className="regular-competitions-back"
          onClick={onBack}
        >
          🏠 Main Menu
        </button>
      </div>

      <div className="regular-competitions-grid">
        {templates.map((template) => (
          <button
            key={template.type}
            type="button"
            className={`regular-competition-card${
              template.type === "addNew" ? " regular-competition-card-add" : ""
            }${
              selectedType === template.type
                ? " regular-competition-card-selected"
                : ""
            }`}
            onClick={() => handleTemplateClick(template.type)}
          >
            <span className="regular-competition-number">
              {template.number}
            </span>
            <span className="regular-competition-title">
              {template.title}
            </span>
            <span className="regular-competition-description">
              {template.description}
            </span>
          </button>
        ))}
      </div>


      {selectedTemplate !== null && selectedTemplate.type !== "addNew" && (
        <div ref={createPanelRef} className="regular-competition-create-panel">
          <div>
            <div className="regular-competition-create-kicker">
              CREATE FROM TEMPLATE
            </div>
            <h2>{selectedTemplate.title}</h2>
          </div>

          <div className="regular-competition-date-field">
            <label htmlFor="regular-competition-date">
              Competition Date
            </label>
            <input
              id="regular-competition-date"
              type="text"
              value={eventDate}
              placeholder="DD/MM/YYYY"
              onChange={(event) => setEventDate(event.target.value)}
              autoFocus
            />
            <div className="regular-competition-date-help">
              {weekday
                ? weekday
                : "Please enter the date as DD/MM/YYYY"}
            </div>
          </div>

          <div className="regular-competition-create-actions">
            <button
              type="button"
              className="regular-competition-cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="regular-competition-create"
              onClick={handleCreate}
              disabled={!weekday}
            >
              Create
            </button>
          </div>
        </div>
      )}

      <section
        style={{
          marginTop: "34px",
          paddingTop: "26px",
          borderTop: "1px solid #d6e1d4",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <div className="regular-competitions-kicker">MONDAY CLUB DESK</div>
          <h2
            style={{
              margin: "4px 0 6px",
              color: "#3f6844",
              fontSize: "28px",
            }}
          >
            Current Competitions
          </h2>
          <p style={{ margin: 0, color: "#5f6f63" }}>
            Open an existing Monday Club competition.
          </p>
        </div>

        {currentCompetitions.length === 0 ? (
          <div
            style={{
              padding: "22px",
              border: "1px solid #d6e1d4",
              borderRadius: "14px",
              background: "#fbfdfb",
              color: "#5f6f63",
              textAlign: "center",
            }}
          >
            No current Monday Club competitions.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {currentCompetitions.map((competition) => (
              <div
                key={competition.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 150px 110px 190px",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px 18px",
                  border: "1px solid #cbdcc8",
                  borderRadius: "14px",
                  background: "#fbfdfb",
                  boxShadow: "0 4px 12px rgba(79,118,84,.06)",
                }}
              >
                <strong style={{ color: "#3f6844", fontSize: "18px" }}>
                  {competition.eventNumber}
                </strong>

                <strong style={{ color: "#35563a", fontSize: "17px" }}>
                  {competition.eventName}
                </strong>

                <span style={{ color: "#526258" }}>
                  {competition.eventDate}
                </span>

                <span
                  style={{
                    justifySelf: "start",
                    padding: "5px 10px",
                    borderRadius: "999px",
                    background:
                      competition.status === "Published"
                        ? "#e2f0df"
                        : "#fff3e6",
                    color:
                      competition.status === "Published"
                        ? "#3f6844"
                        : "#a45100",
                    fontWeight: 700,
                    fontSize: "13px",
                  }}
                >
                  {competition.status}
                </span>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    className="regular-competition-create"
                    style={{
                      minWidth: "78px",
                      minHeight: "38px",
                      padding: "8px 14px",
                    }}
                    onClick={() => onOpenCompetition(competition.id)}
                  >
                    Open
                  </button>

                  <button
                    type="button"
                    style={{
                      minWidth: "88px",
                      minHeight: "38px",
                      padding: "8px 12px",
                      border: "1px solid #d9b5b0",
                      borderRadius: "9px",
                      background: "white",
                      color: "#b42318",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    onClick={() => onDeleteCompetition(competition.id)}
                    title={`Permanently delete ${competition.eventNumber}`}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>



    </section>
  );
}

export default RegularCompetitions;
