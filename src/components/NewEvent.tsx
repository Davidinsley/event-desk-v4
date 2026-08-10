// NewEvent.tsx

import "./NewEvent.css";

import type { Event } from "../types/Event";

import PageLayout from "../layout/PageLayout";
import SummaryCard from "../ui/SummaryCard";
import ActionTile from "../ui/ActionTile";

import {
  Save,
  Copy,
  FolderOpen,
  ClipboardList,
  Eye,
  Trash2,
} from "lucide-react";

interface NewEventProps {
  event: Event;
  setEvent: React.Dispatch<React.SetStateAction<Event>>;
  attachedPosterId: string | null;
  onAttachPoster: () => void;
  onDeleteEvent: () => void;
  canDelete: boolean;
}

export default function NewEvent({
  event,
  setEvent,
  attachedPosterId,
  onAttachPoster,
  onDeleteEvent,
  canDelete,
}: NewEventProps) {
  const summary = (
    <div className="players-summary">
      <SummaryCard
        title="Event No."
        value={event.eventNumber}
      />

      <SummaryCard
        title="Status"
        value="Draft"
      />

      <SummaryCard
        title="Venue"
        value="Ramsdale"
        subValue="Park GC"
      />

      <SummaryCard
        title="Players"
        value={`0 / ${event.playerLimit}`}
      />

      <SummaryCard
        title="Entry Fee"
        value={`£${event.entryFee}`}
      />
    </div>
  );

  const actions = (
    <div className="players-actions">
      <ActionTile
        icon={Save}
        title="Save"
        primary
      />

      <ActionTile
        icon={FolderOpen}
        title="Template"
      />

      <ActionTile
        icon={Copy}
        title="Duplicate"
      />

      <ActionTile
        icon={ClipboardList}
        title="Checklist"
      />

      <ActionTile
        icon={Eye}
        title="Preview"
      />

      {canDelete && (
        <ActionTile
          icon={Trash2}
          title="Delete"
          onClick={onDeleteEvent}
        />
      )}
    </div>
  );

  return (
    <PageLayout
      title="Event Details"
      subtitle="Create and configure a new Ramsdale Seniors event."
      summary={summary}
      actions={actions}
      footer="Complete the event details before moving on to Competition Setup."
    >
      <div className="event-details">

        <div className="form-grid">

          <div className="field full-width">
            <label>Event Name</label>

            <input
              type="text"
              value={event.eventName}
              onChange={(e) =>
                setEvent({
                  ...event,
                  eventName: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>Event Date</label>

            <input
              type="text"
              value={event.eventDate}
              placeholder="DD/MM/YYYY"
              onChange={(e) =>
                setEvent({
                  ...event,
                  eventDate: e.target.value,
                })
              }
            />

            <div className="field-help">
              Please enter the date as DD/MM/YYYY
            </div>
          </div>

          <div className="field">
            <label>Venue</label>

            <input
              type="text"
              value={event.venue}
              onChange={(e) =>
                setEvent({
                  ...event,
                  venue: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>Competition</label>

            <input
              type="text"
              value={event.competition}
              onChange={(e) =>
                setEvent({
                  ...event,
                  competition: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>Entry Fee</label>

            <input
              type="number"
              value={event.entryFee}
              onChange={(e) =>
                setEvent({
                  ...event,
                  entryFee: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="field">
            <label>Maximum Players</label>

            <input
              type="number"
              value={event.playerLimit}
              onChange={(e) =>
                setEvent({
                  ...event,
                  playerLimit: Number(e.target.value),
                })
              }
            />
          </div>

        </div>

        <div className="event-poster-section">

          <h2>Event Poster</h2>

          <div
            className="poster-attachment-box"
            style={{
              minHeight: "260px",
              border: "2px dashed #cfe0f5",
              borderRadius: "14px",
              background: "#f8fbff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "30px",
              marginTop: "12px",
            }}
          >

            <div
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "10px",
                background: "#eef5fd",
                border: "1px solid #d7e6f7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "42px",
                marginBottom: "18px",
              }}
            >
              🖼️
            </div>

            <h3
              style={{
                margin: "0 0 8px 0",
                color: "#225ca8",
                fontSize: "21px",
              }}
            >
              {attachedPosterId
                ? "Poster Attached"
                : "No Poster Attached"}
            </h3>

            <p
              style={{
                margin: "0 0 20px 0",
                color: "#666",
                fontSize: "15px",
              }}
            >
              {attachedPosterId
                ? "An event poster is attached to this event."
                : "You can attach an event poster from the Poster Library."}
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={onAttachPoster}
            >
              {attachedPosterId
                ? "Change Poster"
                : "Attach Poster"}
            </button>

          </div>

        </div>

      </div>
    </PageLayout>
  );
}