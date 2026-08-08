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
  onDeleteEvent,
  canDelete,
}: NewEventProps) {

  console.log("NEW EVENT COMPONENT");
  console.log("Current Event:", event.eventName);

  const summary = (
    <div className="players-summary">
      <SummaryCard title="Event No." value={event.eventNumber} />
      <SummaryCard title="Status" value="Draft" />
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
      <ActionTile icon={Save} title="Save" primary />
      <ActionTile icon={FolderOpen} title="Template" />
      <ActionTile icon={Copy} title="Duplicate" />
      <ActionTile icon={ClipboardList} title="Checklist" />
      <ActionTile icon={Eye} title="Preview" />
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
              onChange={(e) => {

                console.log("EVENT NAME CHANGED");
                console.log("Typed:", e.target.value);

                setEvent({
                  ...event,
                  eventName: e.target.value,
                });

              }}
            />

          </div>

          <div className="field">
            <label>Event Date</label>

            <input
              type="text"
              value={event.eventDate}
              onChange={(e) =>
                setEvent({
                  ...event,
                  eventDate: e.target.value,
                })
              }
            />

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

        <div className="button-bar">
          <button className="primary-button">
            Save Event Details
          </button>
        </div>

      </div>
    </PageLayout>
  );
}