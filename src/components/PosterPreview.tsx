import "./PosterPreview.css";

import type { Event } from "../types/Event";

import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Printer,
  Download,
} from "lucide-react";

interface PosterPreviewProps {
  event: Event;
  onBack: () => void;
}

export default function PosterPreview({
  event,
  onBack,
}: PosterPreviewProps) {

  return (

    <div className="preview-screen">

      <header className="preview-toolbar">

        <button
          className="toolbar-button"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          Back to Poster Studio
        </button>

        <div className="toolbar-title">
          Poster Preview
        </div>

        <div className="toolbar-actions">

          <button className="toolbar-button">
            <ZoomOut size={18} />
          </button>

          <button className="toolbar-button">
            <ZoomIn size={18} />
          </button>

          <button className="toolbar-button">
            <Printer size={18} />
            Print
          </button>

          <button className="toolbar-button">
            <Download size={18} />
            Export
          </button>

        </div>

      </header>

      <main className="preview-workspace">

        <div className="poster-sheet">

          <div className="poster-header">

            <h1>Ramsdale Seniors</h1>

            <h2>{event.eventName}</h2>

          </div>

          <div className="poster-image">

            Event Image

          </div>

          <div className="poster-body">

            <h3>{event.competition}</h3>

            <p>
              <strong>Date:</strong> {event.eventDate || "Not Set"}
            </p>

            <p>
              <strong>Venue:</strong> {event.venue}
            </p>

            <p>
              <strong>Entry Fee:</strong> £{event.entryFee}
            </p>

            <p>
              <strong>Maximum Players:</strong> {event.playerLimit}
            </p>

          </div>

          <div className="poster-footer">

            Ramsdale Seniors Event Desk

          </div>

        </div>

      </main>

    </div>

  );

}