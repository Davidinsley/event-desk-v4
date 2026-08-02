import { useState } from "react";
import type { Event } from "../types/Event";

import "./Posters.css";

import PageLayout from "../layout/PageLayout";
import SummaryCard from "../ui/SummaryCard";
import ActionTile from "../ui/ActionTile";

import {
  Wand2,
  Eye,
  Printer,
  Download,
} from "lucide-react";

interface PostersProps {
  event: Event;
  onPreview: () => void;
}

const templates = [
  {
    title: "Mixed Open",
    description: "Mixed competition poster",
  },
  {
    title: "Away Day",
    description: "Away day event",
  },
  {
    title: "Texas Scramble",
    description: "Team scramble format",
  },
  {
    title: "Betterball",
    description: "Pairs competition",
  },
  {
    title: "Charity Day",
    description: "Charity fundraiser",
  },
  {
    title: "Championship",
    description: "Club championship",
  },
  {
    title: "Stableford",
    description: "Individual Stableford",
  },
  {
    title: "Custom Poster",
    description: "Blank template",
  },
];

export default function Posters({
  event,
  onPreview,
}: PostersProps) {

  const [selected, setSelected] = useState(templates[0]);

  const summary = (
    <div className="page-summary">

      <SummaryCard title="Templates" value="8" />

      <SummaryCard
        title="Poster Template"
        value={selected.title}
      />

      <SummaryCard title="Preview" value="Live" />

      <SummaryCard title="Size" value="A4" />

      <SummaryCard title="Status" value="Draft" />

    </div>
  );

  const actions = (
    <div className="page-actions">

      <ActionTile
        icon={Wand2}
        title="Generate"
        primary
      />

      <ActionTile
        icon={Eye}
        title="Preview"
        onClick={onPreview}
      />

      <ActionTile
        icon={Printer}
        title="Print"
      />

      <ActionTile
        icon={Download}
        title="Export"
      />

    </div>
  );

  return (

    <PageLayout
      title="Poster Studio"
      subtitle="Design, preview and publish professional event posters."
      summary={summary}
      actions={actions}
      footer="Poster Studio"
    >

      <div className="poster-studio">

        <div className="poster-library">

          {templates.map((template) => (

            <div
              key={template.title}
              className={
                selected.title === template.title
                  ? "poster-card active"
                  : "poster-card"
              }
              onClick={() => setSelected(template)}
            >

              <h4>{template.title}</h4>

              <p>{template.description}</p>

            </div>

          ))}

        </div>

        <div className="poster-preview">

          <div className="poster-page">

            <div className="poster-header">

              <h1>Ramsdale Seniors</h1>

              <h2>{event.eventName}</h2>

            </div>

            <div className="poster-image">

              Event Image

            </div>

            <div className="poster-info">

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
                <strong>Player Limit:</strong> {event.playerLimit}
              </p>

            </div>

            <div className="poster-footer">

              Ramsdale Seniors Event Desk

            </div>

          </div>

        </div>

      </div>

    </PageLayout>

  );

}