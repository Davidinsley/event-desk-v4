// Dashboard.tsx
// Ramsdale Par 3 Event Desk
// Revision: Three uniform dashboard tiles with descriptors

import "./Dashboard.css";

interface DashboardProps {
  onNewEvent: () => void;
  onPriorityEvent: () => void;
  onEventDesk: () => void;
  onRecentEvents: () => void;
  onMatchBooklets: () => void;
  onDiary?: () => void;
  onBackupRestore?: () => void;
  onRegularCompetitions?: () => void;
  hasDiaryRedNotice?: boolean;
  priorityEventName?: string;
  priorityEventDate?: string;
  priorityEventCountdown?: string;
}

function NewEventIcon() {
  return (
    <svg className="dashboard-icon" viewBox="0 0 80 80" aria-hidden="true">
      <line x1="40" y1="14" x2="40" y2="66" />
      <line x1="14" y1="40" x2="66" y2="40" />
    </svg>
  );
}

function PriorityIcon() {
  return (
    <svg className="dashboard-icon" viewBox="0 0 100 80" aria-hidden="true">
      <path d="M28 68V12" />
      <path d="M29 15h43l-9 13 9 13H29" />
    </svg>
  );
}

function EventDeskIcon() {
  return (
    <svg className="dashboard-icon" viewBox="0 0 100 80" aria-hidden="true">
      <rect x="18" y="14" width="64" height="52" rx="5" />
      <line x1="30" y1="28" x2="70" y2="28" />
      <line x1="30" y1="40" x2="70" y2="40" />
      <line x1="30" y1="52" x2="58" y2="52" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      viewBox="0 0 100 80"
      aria-hidden="true"
      style={{
        width: "28px",
        height: "24px",
        display: "block",
        flex: "0 0 28px",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 4.5,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }}
    >
      <circle cx="58" cy="40" r="24" />
      <line x1="58" y1="40" x2="58" y2="25" />
      <line x1="58" y1="40" x2="69" y2="47" />
      <line x1="31" y1="40" x2="12" y2="40" />
      <polyline points="19,32 11,40 19,48" />
    </svg>
  );
}

function DiaryIcon() {
  return (
    <svg
      viewBox="0 0 100 80"
      aria-hidden="true"
      className="dashboard-secondary-icon"
    >
      <rect x="18" y="18" width="64" height="50" rx="6" />
      <line x1="18" y1="32" x2="82" y2="32" />
      <line x1="34" y1="10" x2="34" y2="24" />
      <line x1="66" y1="10" x2="66" y2="24" />
      <line x1="34" y1="44" x2="44" y2="44" />
      <line x1="56" y1="44" x2="66" y2="44" />
      <line x1="34" y1="56" x2="44" y2="56" />
      <line x1="56" y1="56" x2="66" y2="56" />
    </svg>
  );
}

function Dashboard({
  onNewEvent,
  onPriorityEvent,
  onEventDesk,
  onRecentEvents,
  onDiary,
  onBackupRestore,
  hasDiaryRedNotice = false,
  priorityEventName,
  priorityEventDate,
  priorityEventCountdown,
}: DashboardProps) {
  const hasPriorityEvent = Boolean(priorityEventName);

  return (
    <section className="dashboard-screen">
      <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <button type="button" className="dashboard-card" onClick={onNewEvent}>
          <span className="dashboard-card-content">
            <NewEventIcon />
            <span className="dashboard-card-title">New Event</span>
            <span className="dashboard-card-description">
              Create a brand new Ramsdale Park GC Par 3 Club event.
            </span>
          </span>
        </button>

        <button
          type="button"
          className="dashboard-card"
          onClick={onPriorityEvent}
          style={{
            background: hasPriorityEvent ? "#fffaf0" : undefined,
            borderColor: hasPriorityEvent ? "#e9cf8a" : undefined,
          }}
        >
          <span className="dashboard-card-content">
            <PriorityIcon />
            <span className="dashboard-card-title">Priority Event</span>
            <span className="dashboard-card-description">
              {hasPriorityEvent ? (
                <>
                  <strong style={{ color: "#174f91" }}>{priorityEventName}</strong>
                  <br />
                  {priorityEventDate || "Date not yet entered"}
                  {priorityEventCountdown ? ` • ${priorityEventCountdown}` : ""}
                </>
              ) : (
                <>
                  <strong>No Priority Event Set</strong>
                  <br />
                  Open Event Desk to select one.
                </>
              )}
            </span>
          </span>
        </button>

        <button type="button" className="dashboard-card" onClick={onEventDesk}>
          <span className="dashboard-card-content">
            <EventDeskIcon />
            <span className="dashboard-card-title">Event Desk</span>
            <span className="dashboard-card-description">
              View, prioritise and manage all current events.
            </span>
          </span>
        </button>

      </div>

      <div className="dashboard-secondary-row">
        <button
          type="button"
          className="dashboard-secondary-button"
          onClick={() => onDiary?.()}
          style={
            hasDiaryRedNotice
              ? {
                  background: "#fef2f2",
                  borderColor: "#f3a6a6",
                  color: "#991b1b",
                }
              : undefined
          }
          aria-label={
            hasDiaryRedNotice
              ? "Diary — immediate action required"
              : "Diary"
          }
        >
          <DiaryIcon />
          <span>Diary</span>
        </button>

        <button
          type="button"
          className="dashboard-secondary-button"
          onClick={onRecentEvents}
        >
          <HistoryIcon />
          <span>Past Events</span>
        </button>

        <button
          type="button"
          className="dashboard-secondary-button"
          onClick={() => onBackupRestore?.()}
        >
          <span aria-hidden="true" style={{ fontSize: "22px", lineHeight: 1 }}>↕</span>
          <span>Backup &amp; Restore</span>
        </button>

      </div>
    </section>
  );
}

export default Dashboard;
