import { useState } from "react";
import type { Event } from "../types/Event";

import "./PosterPreview.css";

import PageLayout from "../layout/PageLayout";
import SummaryCard from "../ui/SummaryCard";
import ActionTile from "../ui/ActionTile";

import {
  ArrowLeft,
  ZoomOut,
  ZoomIn,
  Printer,
  Download,
} from "lucide-react";

interface PosterPreviewProps {
  event: Event;
  posterId: string | null;
  onBack: () => void;
}

export default function PosterPreview({
  event,
  posterId,
  onBack,
}: PosterPreviewProps) {

  //--------------------------------------------------
  // Zoom State
  //--------------------------------------------------

  const [zoom, setZoom] = useState(100);

  const zoomIn = () => {
    setZoom((current) => Math.min(current + 10, 200));
  };

  const zoomOut = () => {
    setZoom((current) => Math.max(current - 10, 50));
  };
const posters = JSON.parse(
  localStorage.getItem("poster-library") ?? "[]"
);

const selectedPoster = posters.find(
  (poster: any) => poster.id === posterId
);
  //--------------------------------------------------
  // Summary Cards
  //--------------------------------------------------

  const summary = (
    <div className="page-summary">
      <SummaryCard title="Template" value="Current" />
      <SummaryCard title="Preview" value="A4" />
      <SummaryCard title="Zoom" value={`${zoom}%`} />
      <SummaryCard title="Status" value="Draft" />
    </div>
  );

  //--------------------------------------------------
  // Action Tiles
  //--------------------------------------------------

  const actions = (
    <div className="page-actions">

      <ActionTile
        icon={ArrowLeft}
        title="Posters"
        onClick={onBack}
      />

      <ActionTile
        icon={ZoomOut}
        title="Zoom Out"
        onClick={zoomOut}
      />

      <ActionTile
        icon={ZoomIn}
        title="Zoom In"
        onClick={zoomIn}
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
      title="Poster Preview"
      subtitle="Review your poster before printing or publishing."
      summary={summary}
      actions={actions}
      footer="Poster Preview"
    >
      <div className="preview-viewer">

        <div className="document-viewer">

          <div className="preview-canvas">

            <div
              className="poster-sheet"
              style={{
                transform: `scale(${zoom / 100})`,
              }}
            >

              <div className="poster-header">

                <h1>Ramsdale Seniors</h1>

                <h2>{event.eventName}</h2>

              </div>

              <div className="poster-image">
  {selectedPoster ? (
    <img
      src={selectedPoster.thumbnail}
      alt={selectedPoster.name}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  ) : (
    <div>No poster selected</div>
  )}
</div>

              <div className="poster-body">

                <h3>{event.competition}</h3>

                <p>
                  <strong>Date:</strong>{" "}
                  {event.eventDate || "Not Set"}
                </p>

                <p>
                  <strong>Venue:</strong>{" "}
                  {event.venue}
                </p>

                <p>
                  <strong>Entry Fee:</strong> £{event.entryFee}
                </p>

                <p>
                  <strong>Player Limit:</strong>{" "}
                  {event.playerLimit}
                </p>

              </div>

              <div className="poster-footer">
                Ramsdale Seniors Event Desk
              </div>

            </div>

          </div>

        </div>

      </div>

    </PageLayout>
  );
}