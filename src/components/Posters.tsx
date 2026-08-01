import { useState } from "react";
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
    description: "Individual stableford",
  },
  {
    title: "Custom Poster",
    description: "Blank template",
  },
];

export default function Posters() {

  const [selected, setSelected] = useState(templates[0]);

  const summary = (
    <div className="page-summary">

      <SummaryCard title="Templates" value="8" />
      <SummaryCard title="Selected" value={selected.title} />
      <SummaryCard title="Preview" value="Live" />
      <SummaryCard title="Exports" value="0" />
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
      subtitle="Professional event poster generator."
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

              <h1>
                Ramsdale Seniors
              </h1>

              <h2>
                {selected.title}
              </h2>

            </div>

            <div className="poster-image">

              Event Image

            </div>

            <div className="poster-info">

              <h3>
                Live Poster Preview
              </h3>

              <p>

                This is now a genuine poster canvas.

              </p>

              <p>

                Next we replace this placeholder with
                the real Ramsdale poster layout.

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
