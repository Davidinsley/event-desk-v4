import { useState } from "react";
import type { Player } from "./types/Player";
import "./App.css";
import logo from "./assets/Emblem.png";

import Dashboard from "./components/Dashboard";
import NewEvent from "./components/NewEvent";
import Competition from "./components/Competition";
import Players from "./components/Players";
import HandicapUpdate from "./components/HandicapUpdate";

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [players, setPlayers] = useState<Player[]>([]);

  const eventOpen = currentPage !== "dashboard";

  return (
    <div className={`app ${eventOpen ? "event-mode" : "dashboard-mode"}`}>
      <header className="header">
        <img
          src={logo}
          alt="Ramsdale Park Golf Club"
          className="logo"
        />

        <div className="header-title">
          <h1>Ramsdale Seniors Event Desk</h1>
          <p>Special Events Management</p>
        </div>
      </header>

      {eventOpen && (
        <aside className="sidebar">
          <h3>EVENT SETUP</h3>

          <ul>
            <li
              className={currentPage === "new" ? "active" : ""}
              onClick={() => setCurrentPage("new")}
            >
              🏌️ Event Details
            </li>

            <li
              className={currentPage === "competition" ? "active" : ""}
              onClick={() => setCurrentPage("competition")}
            >
              🏆 Competition
            </li>

            <li
              className={currentPage === "players" ? "active" : ""}
              onClick={() => setCurrentPage("players")}
            >
              👥 Players
            </li>

            <li
  className={currentPage === "handicap" ? "active" : ""}
  onClick={() => setCurrentPage("handicap")}
>
  🏌️ Handicap Update
</li>
            <li>📋 Field Management</li>
            <li>🍽 Catering</li>
            <li>❤️ Charity</li>
            <li>🎨 Posters</li>
            <li>📖 Booklets</li>
            <li>✅ Review & Publish</li>
          </ul>
        </aside>
      )}

      <main className="main">
        <div className="app-workspace">
          {currentPage === "dashboard" && (
            <Dashboard
              onNewEvent={() => setCurrentPage("new")}
            />
          )}

          {currentPage === "new" && <NewEvent />}

          {currentPage === "competition" && <Competition />}

         {currentPage === "players" && (
  <Players
    players={players}
    setPlayers={setPlayers}
  />
)}
          {currentPage === "handicap" && <HandicapUpdate />}
        </div>
      </main>

      <footer className="status">
        <span>Status: Ready</span>
        <span>Version 1.0</span>
      </footer>
    </div>
  );
}