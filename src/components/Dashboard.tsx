// Dashboard.tsx
// Ramsdale Seniors Event Desk
// Revision: Three uniform dashboard tiles with descriptors

import "./Dashboard.css";

interface DashboardProps {
  onNewEvent: () => void;
  onPriorityEvent: () => void;
  onEventDesk: () => void;
  onRecentEvents: () => void;
  onMatchBooklets: () => void;
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

function OpenBookIcon() {
  return (
    <svg className="dashboard-icon dashboard-book-icon" viewBox="0 0 100 80" aria-hidden="true">
      <path d="M50 15c-10-9-22-12-38-10v52c16-2 28 1 38 10" />
      <path d="M50 15c10-9 22-12 38-10v52c-16 2-28 1-38 10" />
      <line x1="50" y1="15" x2="50" y2="67" />
      <path d="M12 57c15-2 27 1 38 10" />
      <path d="M88 57c-15-2-27 1-38 10" />
    </svg>
  );
}

function Dashboard({
  onNewEvent,
  onPriorityEvent,
  onEventDesk,
  onRecentEvents,
  onMatchBooklets,
  priorityEventName,
  priorityEventDate,
  priorityEventCountdown,
}: DashboardProps) {
  const hasPriorityEvent = Boolean(priorityEventName);

  return (
    <section className="dashboard-screen">
      <div className="dashboard-grid">
        <button type="button" className="dashboard-card" onClick={onNewEvent}>
          <span className="dashboard-card-content">
            <NewEventIcon />
            <span className="dashboard-card-title">New Event</span>
            <span className="dashboard-card-description">
              Create a brand new Ramsdale Seniors event.
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

        <button
          type="button"
          className="dashboard-card"
          onClick={onMatchBooklets}
        >
          <span className="dashboard-card-content">
            <OpenBookIcon />
            <span className="dashboard-card-title">Match Booklets</span>
            <span className="dashboard-card-description">
              Create and print booklets for home matches.
            </span>
          </span>
        </button>
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginTop: "24px",
        }}
      >
        <button
          type="button"
          onClick={onRecentEvents}
          style={{
            width: "240px",
            minHeight: "52px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "10px 20px",
            border: "1px solid #9fc9ef",
            borderRadius: "12px",
            background: "#ffffff",
            color: "#174f91",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            boxSizing: "border-box",
          }}
        >
          <HistoryIcon />
          <span>Past Events</span>
        </button>
      </div>
    </section>
  );
}

export default Dashboard;
