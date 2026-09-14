// Competition.tsx
// Revision: User-addable and deletable persistent Competition Formats

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import "./NewEvent.css";

import type { Event } from "../types/Event";

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

const CUSTOM_FORMATS_KEY = "eventDeskCustomCompetitionFormats";

const BUILT_IN_FORMATS = [
  "Stableford",
  "Betterball Stableford",
  "Medal",
  "Texas Scramble",
  "Greensomes",
  "4BBB",
];

const loadCustomFormats = (): string[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_FORMATS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string =>
          typeof item === "string" && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
};

interface CompetitionProps {
  event: Event;
  setEvent: Dispatch<SetStateAction<Event>>;
}

export default function Competition({
  event,
  setEvent,
}: CompetitionProps) {
  const [showSaved, setShowSaved] = useState(false);
  const [customFormats, setCustomFormats] =
    useState<string[]>(loadCustomFormats);

  const updateEvent = (changes: Partial<Event>) => {
    setEvent((current) => ({
      ...current,
      ...changes,
    }));

    setShowSaved(false);
  };

  const handleSave = () => {
    setShowSaved(true);

    window.setTimeout(() => {
      setShowSaved(false);
    }, 2000);
  };

  const handleCompetitionFormatChange = (value: string) => {
    if (value === "__add_format__") {
      const entered = window.prompt("Enter the new competition format:");
      if (entered === null) return;

      const newFormat = entered.trim();

      if (!newFormat) {
        window.alert("Please enter a competition format.");
        return;
      }

      const existingFormat = [...BUILT_IN_FORMATS, ...customFormats].find(
        (format) => format.toLowerCase() === newFormat.toLowerCase(),
      );

      if (existingFormat) {
        window.alert(
          `"${existingFormat}" is already in the Competition Format list.`,
        );
        updateEvent({ competitionFormat: existingFormat });
        return;
      }

      const nextCustomFormats = [...customFormats, newFormat];

      try {
        localStorage.setItem(
          CUSTOM_FORMATS_KEY,
          JSON.stringify(nextCustomFormats),
        );
      } catch (error) {
        console.error("Failed to save custom competition format", error);
        window.alert("The new competition format could not be saved.");
        return;
      }

      setCustomFormats(nextCustomFormats);
      updateEvent({ competitionFormat: newFormat });
      return;
    }

    if (value === "__delete_format__") {
      if (customFormats.length === 0) {
        window.alert("There are no custom competition formats to delete.");
        return;
      }

      const customFormatList = customFormats
        .map((format, index) => `${index + 1}. ${format}`)
        .join("\n");

      const entered = window.prompt(
        `Enter the number of the custom format to delete:\n\n${customFormatList}`,
      );

      if (entered === null) return;

      const selectedNumber = Number(entered.trim());

      if (
        !Number.isInteger(selectedNumber) ||
        selectedNumber < 1 ||
        selectedNumber > customFormats.length
      ) {
        window.alert("Please enter a valid number from the list.");
        return;
      }

      const formatToDelete = customFormats[selectedNumber - 1];

      const confirmed = window.confirm(
        `Delete "${formatToDelete}" from the Competition Format list?`,
      );

      if (!confirmed) return;

      const nextCustomFormats = customFormats.filter(
        (format) => format !== formatToDelete,
      );

      try {
        localStorage.setItem(
          CUSTOM_FORMATS_KEY,
          JSON.stringify(nextCustomFormats),
        );
      } catch (error) {
        console.error("Failed to delete custom competition format", error);
        window.alert("The competition format could not be deleted.");
        return;
      }

      setCustomFormats(nextCustomFormats);

      if (event.competitionFormat === formatToDelete) {
        updateEvent({ competitionFormat: "" });
      }

      return;
    }

    updateEvent({ competitionFormat: value });
  };

  type CompetitionStatus = "draft" | "published" | "archived";

  const [eventStatus, setEventStatus] =
    useState<CompetitionStatus>("draft");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(
        "eventDeskEventRecords"
      );

      if (!stored) {
        setEventStatus("draft");
        return;
      }

      const records = JSON.parse(stored);
      const record = Array.isArray(records)
        ? records.find(
            (item: { id?: string; event?: { eventNumber?: string } }) =>
              item?.id === event.eventNumber ||
              item?.event?.eventNumber === event.eventNumber
          )
        : null;

      if (record?.archived) {
        setEventStatus("archived");
      } else if (record?.published) {
        setEventStatus("published");
      } else {
        setEventStatus("draft");
      }
    } catch {
      setEventStatus("draft");
    }
  }, [event.eventNumber]);

  const getStatusLabel = (status: CompetitionStatus) => {
    switch (status) {
      case "published":
        return "Published";
      case "archived":
        return "Archived";
      case "draft":
      default:
        return "Draft";
    }
  };

  const summary = (
    <div className="page-summary">
      <SummaryCard
        title="Format"
        value={event.competitionFormat || "—"}
      />

      <SummaryCard
        title="Rounds"
        value={String(event.competitionRounds || 1)}
      />

      <SummaryCard
        title="Tee"
        value={event.teeColour || "—"}
      />

      <SummaryCard
        title="Allowance"
        value={`${event.handicapAllowance ?? 100}%`}
      />

      <SummaryCard
        title="Status"
        value={getStatusLabel(eventStatus)}
      />
    </div>
  );

  const actions = (
    <div className="page-actions">

      <ActionTile
        icon={Save}
        title={showSaved ? "Saved" : "Save"}
        primary
        onClick={handleSave}
      />

      <ActionTile
        icon={FolderOpen}
        title="Template"
        subtitle="FD"
        disabled
      />

      <ActionTile
        icon={Copy}
        title="Duplicate"
        subtitle="FD"
        disabled
      />

      <ActionTile
        icon={ClipboardList}
        title="Rules"
        subtitle="FD"
        disabled
      />

      <ActionTile
        icon={Eye}
        title="Preview"
        subtitle="FD"
        disabled
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
              placeholder="e.g. Home & Away Pairs Championship"
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
                handleCompetitionFormatChange(e.target.value)
              }
            >
              <option value="">Select...</option>

              {BUILT_IN_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}

              {customFormats.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}

              <option value="__add_format__">
                + Add Format...
              </option>

              <option value="__delete_format__">
                − Delete Custom Format...
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
                  competitionRounds: Math.max(
                    1,
                    Number(e.target.value)
                  ),
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
                  handicapAllowance: Math.min(
                    100,
                    Math.max(
                      0,
                      Number(e.target.value)
                    )
                  ),
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

        <div className="button-bar">
          <button
            type="button"
            className="primary-button"
            onClick={handleSave}
          >
            {showSaved
              ? "Competition Details Saved"
              : "Save Competition Details"}
          </button>
        </div>

      </div>
    </PageLayout>
  );
}