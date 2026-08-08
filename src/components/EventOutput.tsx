import type { Event } from "../types/Event";
import type { Player } from "../types/Player";

import "./EventOutput.css";

import PageLayout from "../layout/PageLayout";

import {
  ArrowLeft,
  Printer,
  FileText,
  CheckCircle,
} from "lucide-react";

interface EventOutputProps {
  event: Event;
  players: Player[];
  onBack: () => void;
}

export default function EventOutput({
  event,
  players,
  onBack,
}: EventOutputProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <PageLayout title="Event Output">

      <div className="event-output-page">

        {/* OUTPUT CONTROLS */}

        <div className="event-output-controls">

          <button
            type="button"
            className="output-back-button"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Back to Review & Publish
          </button>

          <div className="output-control-actions">

            <button
              type="button"
              className="output-print-button"
              onClick={handlePrint}
            >
              <Printer size={19} />
              Print Event
            </button>

            <button
              type="button"
              className="output-pdf-button"
              onClick={handlePrint}
            >
              <FileText size={19} />
              Save as PDF
            </button>

          </div>

        </div>

        {/* PRINTABLE DOCUMENT */}

        <div className="event-output-document">

          <div className="event-output-header">

            <div>

              <div className="event-output-brand">
                RAMSDALE SENIORS EVENT DESK
              </div>

              <h1>
                {event.eventName ||
                  "Unnamed Event"}
              </h1>

              <p className="event-output-competition">
                {event.competition ||
                  "Competition not selected"}
              </p>

            </div>

            <div className="event-output-number">
              EVENT
              <strong>
                {event.eventNumber}
              </strong>
            </div>

          </div>

          <div className="published-record-banner">

            <CheckCircle size={20} />

            <div>

              <strong>
                Published Event Record
              </strong>

              <span>
                This document represents the current
                official published version of the event.
              </span>

            </div>

          </div>

          {/* EVENT DETAILS */}

          <section className="output-section">

            <div className="output-section-heading">
              <h2>Event Details</h2>
            </div>

            <div className="output-details-grid">

              <div>
                <span>DATE</span>
                <strong>
                  {event.eventDate || "Not Set"}
                </strong>
              </div>

              <div>
                <span>VENUE</span>
                <strong>
                  {event.venue || "Not Set"}
                </strong>
              </div>

              <div>
                <span>ENTRY FEE</span>
                <strong>
                  £{event.entryFee.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>PLAYER LIMIT</span>
                <strong>
                  {event.playerLimit}
                </strong>
              </div>

            </div>

          </section>

          {/* PLAYER LIST */}

          <section className="output-section">

            <div className="output-section-heading player-heading">

              <div>
                <h2>Player List</h2>

                <p>
                  {players.length} player
                  {players.length === 1 ? "" : "s"} entered
                </p>
              </div>

            </div>

            {players.length === 0 ? (

              <div className="no-players-message">
                No players have been entered for this event.
              </div>

            ) : (

              <div className="output-player-table-wrapper">

                <table className="output-player-table">

                  <thead>

                    <tr>
                      <th>#</th>
                      <th>PLAYER</th>
                      <th>HANDICAP</th>
                      <th>STATUS</th>
                      <th>PAID</th>
                    </tr>

                  </thead>

                  <tbody>

                    {players.map(
                      (player, index) => (

                        <tr key={player.id}>

                          <td>
                            {index + 1}
                          </td>

                          <td className="player-name">
                            {player.firstName}{" "}
                            {player.lastName}
                          </td>

                          <td>
                            {player.handicapIndex.toFixed(1)}
                          </td>

                          <td>
                            <span
                              className={
                                player.status ===
                                "Registered"
                                  ? "player-status registered"
                                  : "player-status waiting"
                              }
                            >
                              {player.status}
                            </span>
                          </td>

                          <td>
                            <span
                              className={
                                player.paid
                                  ? "paid-status paid"
                                  : "paid-status unpaid"
                              }
                            >
                              {player.paid
                                ? "Paid"
                                : "Not Paid"}
                            </span>
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </section>

          {/* OUTPUT FOOTER */}

          <div className="event-output-footer">

            <div>
              Ramsdale Seniors Event Desk
            </div>

            <div>
              Event {event.eventNumber}
            </div>

          </div>

        </div>

      </div>

    </PageLayout>
  );
}