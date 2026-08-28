import { useState } from "react";
import type { Event } from "../types/Event";

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

interface CompetitionProps {
  event: Event;
  setEvent: React.Dispatch<React.SetStateAction<Event>>;
}

export default function Competition({
  event,
  setEvent,
}: CompetitionProps) {
  const [saved, setSaved] = useState(false);

  const updateEvent = (changes: Partial<Event>) => {
    setEvent((current) => ({
      ...current,
      ...changes,
    }));

    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
  };

  const summary = (
    <div className="page-summary">
      <SummaryCard
        title="Format"
        value={event.competitionFormat || "Not set"}
      />

      <SummaryCard
        title="Rounds"
        value={String(event.competitionRounds)}
      />

      <SummaryCard
        title="Tee"
        value={event.teeColour}
      />

      <SummaryCard
        title="Allowance"
        value={`${event.handicapAllowance}%`}
      />

      <SummaryCard
        title="Status"
        value={saved ? "Saved" : "Draft"}
      />
    </div>
  );

  const actions = (
    <div className="page-actions">
      <ActionTile
        icon={Save}
        title="Save"
        primary
        onClick={handleSave}
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
        title="Rules"
      />

      <ActionTile
        icon={Eye}
        title="Preview"
      />
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
            <label htmlFor="competitionName">
              Competition Name
            </label>

            <input
              id="competitionName"
              type="text"
              value={event.competition}
              onChange={(e) =>
                updateEvent({
                  competition: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label htmlFor="competitionCategory">
              Competition Category
            </label>

            <select
              id="competitionCategory"
              value={event.competitionCategory}
              onChange={(e) =>
                updateEvent({
                  competitionCategory: e.target.value,
                })
              }
            >
              <option value="">Select...</option>

              <option value="Individual">
                Individual
              </option>

              <option value="Pairs">
                Pairs
              </option>

              <option value="Team">
                Team
              </option>

              <option value="Mixed">
                Mixed
              </option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="competitionFormat">
              Competition Format
            </label>

            <select
              id="competitionFormat"
              value={event.competitionFormat}
              onChange={(e) =>
                updateEvent({
                  competitionFormat: e.target.value,
                })
              }
            >
              <option value="">Select...</option>

              <option value="Stableford">
                Stableford
              </option>

              <option value="Betterball Stableford">
                Betterball Stableford
              </option>

              <option value="Medal">
                Medal
              </option>

              <option value="Texas Scramble">
                Texas Scramble
              </option>

              <option value="Greensomes">
                Greensomes
              </option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="rounds">
              Number of Rounds
            </label>

            <input
              id="rounds"
              type="number"
              min="1"
              value={event.competitionRounds}
              onChange={(e) =>
                updateEvent({
                  competitionRounds: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="field">
            <label htmlFor="allowance">
              Playing Handicap Allowance (%)
            </label>

            <input
              id="allowance"
              type="number"
              min="0"
              max="100"
              value={event.handicapAllowance}
              onChange={(e) =>
                updateEvent({
                  handicapAllowance: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="field">
            <label htmlFor="teeColour">
              Tee Colour
            </label>

            <select
              id="teeColour"
              value={event.teeColour}
              onChange={(e) =>
                updateEvent({
                  teeColour: e.target.value,
                })
              }
            >
              <option value="Yellow">
                Yellow
              </option>

              <option value="White">
                White
              </option>

              <option value="Red">
                Red
              </option>

              <option value="Blue">
                Blue
              </option>
            </select>
          </div>

          <div className="field full-width">
            <label htmlFor="rules">
              Special Competition Rules
            </label>

            <textarea
              id="rules"
              rows={8}
              value={event.competitionRules}
              placeholder="Enter any special competition rules here..."
              onChange={(e) =>
                updateEvent({
                  competitionRules: e.target.value,
                })
              }
            />
          </div>

        </div>

      </div>
    </PageLayout>
  );
}