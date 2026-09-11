// Dashboard.tsx
// Ramsdale Seniors Event Desk
// Revision: Three uniform dashboard tiles with descriptors

import "./Dashboard.css";

interface DashboardProps {
  onNewEvent: () => void;
  onContinueEvent: () => void;
  onRecentEvents: () => void;
  onMatchBooklets: () => void;
}

function NewEventIcon() {
  return (
    <svg className="dashboard-icon" viewBox="0 0 80 80" aria-hidden="true">
      <line x1="40" y1="14" x2="40" y2="66" />
      <line x1="14" y1="40" x2="66" y2="40" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="dashboard-icon dashboard-folder-icon" viewBox="0 0 100 80" aria-hidden="true">
      <path d="M8 22h30l9 10h45v34c0 5-4 8-9 8H17c-5 0-9-3-9-8V22z" />
      <path d="M8 22v-4c0-5 4-8 9-8h24l9 10" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="dashboard-icon" viewBox="0 0 100 80" aria-hidden="true">
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
  onContinueEvent,
  onRecentEvents,
  onMatchBooklets,
}: DashboardProps) {
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

        <button type="button" className="dashboard-card" onClick={onContinueEvent}>
          <span className="dashboard-card-content">
            <FolderIcon />
            <span className="dashboard-card-title">
              <span>Continue</span>
              <span>Current Event</span>
            </span>
            <span className="dashboard-card-description">
              Resume the current event without creating a new one.
            </span>
          </span>
        </button>

        <button
          type="button"
          className="dashboard-card"
          onClick={onRecentEvents}
        >
          <span className="dashboard-card-content">
            <HistoryIcon />
            <span className="dashboard-card-title">Past Events</span>
            <span className="dashboard-card-description">
              View and reopen previously created events.
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
    </section>
  );
}

export default Dashboard;
