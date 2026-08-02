import { useState } from "react";

import "./App.css";
import logo from "./assets/Emblem.png";

import type { Player } from "./types/Player";
import type { Event } from "./types/Event";

import Dashboard from "./components/Dashboard";
import NewEvent from "./components/NewEvent";
import Competition from "./components/Competition";
import Players from "./components/Players";
import HandicapUpdate from "./components/HandicapUpdate";
import FieldManagement from "./components/FieldManagement";
import Catering from "./components/Catering";
import Posters from "./components/Posters";
import PosterPreview from "./components/PosterPreview";

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const [players, setPlayers] = useState<Player[]>([]);

  const [event, setEvent] = useState<Event>({
    eventNumber: "0001",
    eventName: "Monday Club Home & Away Championship",
    eventDate: "",
    venue: "Ramsdale Park Golf Club",
    competition: "Pairs Championship",
    entryFee: 15,
    playerLimit: 76,
  });

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

            <li
              className={currentPage === "field" ? "active" : ""}
              onClick={() => setCurrentPage("field")}
            >
              📋 Field Management
            </li>

            <li
              className={currentPage === "catering" ? "active" : ""}
              onClick={() => setCurrentPage("catering")}
            >
              🍽 Catering
            </li>

            <li
              className={currentPage === "posters" ? "active" : ""}
              onClick={() => setCurrentPage("posters")}
            >
              🎨 Posters
            </li>

            <li>❤️ Charity</li>
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

          {currentPage === "new" && (
            <NewEvent
              event={event}
              setEvent={setEvent}
            />
          )}

          {currentPage === "competition" && (
            <Competition />
          )}

          {currentPage === "players" && (
            <Players
              players={players}
              setPlayers={setPlayers}
            />
          )}

          {currentPage === "handicap" && (
            <HandicapUpdate
              players={players}
            />
          )}

          {currentPage === "field" && (
            <FieldManagement
              players={players}
            />
          )}

          {currentPage === "catering" && (
            <Catering
              players={players}
            />
          )}

          {currentPage === "posters" && (
            <Posters
              event={event}
              onPreview={() => setCurrentPage("posterPreview")}
            />
          )}

          {currentPage === "posterPreview" && (
            <PosterPreview
              event={event}
              onBack={() => setCurrentPage("posters")}
            />
          )}

        </div>
      </main>

      <footer className="status">
        <span>Status: Ready</span>
        <span>Version 1.0</span>
      </footer>
    </div>
  );
}
