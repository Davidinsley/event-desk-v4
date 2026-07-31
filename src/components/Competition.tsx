import "./NewEvent.css";

import PageLayout from "../layout/PageLayout";
import SummaryCard from "../ui/SummaryCard";
import ActionTile from "../ui/ActionTile";

import {
  Save,
  FolderOpen,
  ClipboardList,
  Eye,
  Copy,
} from "lucide-react";

export default function Competition() {
  const summary = (
    <div className="page-summary">
      <SummaryCard title="Format" value="4BBB" />
      <SummaryCard title="Rounds" value="2" />
      <SummaryCard title="Tee" value="Yellow" />
      <SummaryCard title="Allowance" value="100%" />
      <SummaryCard title="Status" value="Draft" />
    </div>
  );

  const actions = (
    <div className="page-actions">
      <ActionTile icon={Save} title="Save" primary />
      <ActionTile icon={FolderOpen} title="Template" />
      <ActionTile icon={Copy} title="Duplicate" />
      <ActionTile icon={ClipboardList} title="Rules" />
      <ActionTile icon={Eye} title="Preview" />
    </div>
  );

  return (
    <PageLayout
      title="Competition"
      subtitle="Define how this competition will be played. This information will be used throughout the Event Desk."
      summary={summary}
      actions={actions}
      footer="Complete the competition details before moving on to Player Management."
    >
      <div className="event-details">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="competitionName">Competition Name</label>
            <input
              id="competitionName"
              type="text"
              placeholder="e.g. Home & Away Pairs Championship"
            />
          </div>

          <div className="field">
            <label htmlFor="competitionCategory">Competition Category</label>
            <select id="competitionCategory" defaultValue="">
              <option value="">Select...</option>
              <option value="Individual">Individual</option>
              <option value="Pairs">Pairs</option>
              <option value="Team">Team</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="competitionFormat">Competition Format</label>
            <select id="competitionFormat" defaultValue="">
              <option value="">Select...</option>
              <option value="Stableford">Stableford</option>
              <option value="Betterball Stableford">
                Betterball Stableford
              </option>
              <option value="Medal">Medal</option>
              <option value="Texas Scramble">Texas Scramble</option>
              <option value="Greensomes">Greensomes</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="rounds">Number of Rounds</label>
            <input
              id="rounds"
              type="number"
              min="1"
              defaultValue={1}
            />
          </div>

          <div className="field">
            <label htmlFor="allowance">
              Playing Handicap Allowance (%)
            </label>
            <input
              id="allowance"
              type="number"
              defaultValue={100}
            />
          </div>

          <div className="field">
            <label htmlFor="teeColour">Tee Colour</label>
            <select id="teeColour" defaultValue="Yellow">
              <option value="Yellow">Yellow</option>
              <option value="White">White</option>
              <option value="Red">Red</option>
              <option value="Blue">Blue</option>
            </select>
          </div>

          <div className="field full-width">
            <label htmlFor="rules">Special Competition Rules</label>
            <textarea
              id="rules"
              rows={8}
              placeholder="Enter any special competition rules here..."
            />
          </div>
        </div>

        <div className="button-bar">
          <button className="primary-button">
            Save Competition Details
          </button>
        </div>
      </div>
    </PageLayout>
  );
}