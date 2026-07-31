import "./NewEvent.css";

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

export default function NewEvent() {
  const summary = (
    <div className="players-summary">
      <SummaryCard title="Event No." value="0001" />
      <SummaryCard title="Status" value="Draft" />
      <SummaryCard
        title="Venue"
        value="Ramsdale"
        subValue="Park GC"
      />
      <SummaryCard title="Players" value="0 / 76" />
      <SummaryCard title="Entry Fee" value="£15" />
    </div>
  );

  const actions = (
    <div className="players-actions">
      <ActionTile icon={Save} title="Save" primary />
      <ActionTile icon={FolderOpen} title="Template" />
      <ActionTile icon={Copy} title="Duplicate" />
      <ActionTile icon={ClipboardList} title="Checklist" />
      <ActionTile icon={Eye} title="Preview" />
      <ActionTile icon={Trash2} title="Delete" />
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
              placeholder="Monday Club Home & Away Championship"
            />
          </div>

          <div className="field">
            <label>Event Date</label>
            <input type="date" />
          </div>

          <div className="field">
            <label>Venue</label>
            <input
              type="text"
              placeholder="Ramsdale Park Golf Club"
            />
          </div>

          <div className="field">
            <label>Organiser</label>
            <input
              type="text"
              placeholder="Special Events Organiser"
            />
          </div>

          <div className="field">
            <label>Competition Type</label>
            <input
              type="text"
              placeholder="Pairs Championship"
            />
          </div>

          <div className="field">
            <label>Competition Format</label>
            <input
              type="text"
              placeholder="Betterball Stableford"
            />
          </div>

          <div className="field">
            <label>Entry Fee</label>
            <input
              type="text"
              placeholder="£15.00"
            />
          </div>

          <div className="field">
            <label>Maximum Players</label>
            <input
              type="number"
              placeholder="76"
            />
          </div>

          <div className="field">
            <label>First Tee Time</label>
            <input type="time" />
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