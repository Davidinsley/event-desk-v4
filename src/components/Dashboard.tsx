// Dashboard.tsx
// Ramsdale Seniors Event Desk
// Continue Event tile enabled

interface DashboardProps {
    onNewEvent: () => void;
    onContinueEvent: () => void;
}

function Dashboard({
    onNewEvent,
    onContinueEvent,
}: DashboardProps) {
    return (
        <>
            <h2>Dashboard</h2>

            <div className="dashboard-grid">

                <button
                    type="button"
                    className="dashboard-card"
                    onClick={onNewEvent}
                >
                    <h3>➕ New Event</h3>
                    <p>
                        Create a brand new Ramsdale Seniors event.
                    </p>
                </button>

                <button
                    type="button"
                    className="dashboard-card"
                    onClick={onContinueEvent}
                >
                    <h3>📂 Continue Current Event</h3>
                    <p>
                        Resume the current event without creating a new one.
                    </p>
                </button>

                <button
                    type="button"
                    className="dashboard-card"
                >
                    <h3>📋 Event Templates</h3>
                    <p>
                        Start from one of your saved competition templates.
                    </p>
                </button>

                <button
                    type="button"
                    className="dashboard-card"
                >
                    <h3>🕒 Recent Events</h3>
                    <p>
                        View and reopen recently created events.
                    </p>
                </button>

            </div>
        </>
    );
}

export default Dashboard;