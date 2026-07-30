interface DashboardProps {
    onNewEvent: () => void;
}

function Dashboard({ onNewEvent }: DashboardProps) {
    return (
        <>
            <h2>Dashboard</h2>

   <div className="dashboard-grid">


                <button
                    className="dashboard-card"
                    onClick={onNewEvent}
                >
                    <h3>➕ New Event</h3>
                    <p>Create a brand new Ramsdale Seniors event.</p>
                </button>

                <button className="dashboard-card">
                    <h3>📂 Continue Event</h3>
                    <p>Open an event already in progress.</p>
                </button>

                <button className="dashboard-card">
                    <h3>📋 Event Templates</h3>
                    <p>Start from one of your saved competition templates.</p>
                </button>

                <button className="dashboard-card">
                    <h3>🕒 Recent Events</h3>
                    <p>View and reopen recently created events.</p>
                </button>

            </div>
        </>
    );
}

export default Dashboard;