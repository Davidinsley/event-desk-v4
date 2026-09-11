import { useEffect, useState } from "react";
import "./PosterPreview.css";

import PageLayout from "../layout/PageLayout";
import SummaryCard from "../ui/SummaryCard";
import ActionTile from "../ui/ActionTile";
import { getPosterLibrary, type PosterItem } from "../posterStorage";

import {
  ArrowLeft,
  ZoomOut,
  ZoomIn,
  Printer,
  Download,
} from "lucide-react";

interface PosterPreviewProps {
  posterId: string | null;
  onBack: () => void;
}

export default function PosterPreview({
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

  //--------------------------------------------------
  // Poster Lookup — use the same IndexedDB library as Posters
  //--------------------------------------------------

  const [selectedPoster, setSelectedPoster] =
    useState<PosterItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPoster = async () => {
      setIsLoading(true);

      try {
        const posters = await getPosterLibrary();
        if (cancelled) return;

        const poster = posters.find(
          (item) => item.id === posterId
        ) ?? null;

        setSelectedPoster(poster);
      } catch (error) {
        console.error(
          "Failed to load poster library for preview",
          error
        );
        if (!cancelled) {
          setSelectedPoster(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPoster();

    return () => {
      cancelled = true;
    };
  }, [posterId]);

  //--------------------------------------------------
  // Print
  //--------------------------------------------------

  const handlePrint = () => {
    if (!selectedPoster) return;

    const printWindow = window.open("", "_blank");

    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${selectedPoster.title}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              width: 210mm;
              height: 0;
              overflow: hidden;
              background: #ffffff;
            }

            .print-page {
              position: absolute;
              left: 0;
              top: 0;
              width: 210mm;
              height: 296mm;
              overflow: hidden;
            }

            img {
              display: block;
              width: 210mm;
              height: 297mm;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <div class="print-page">
            <img
              id="print-poster"
              alt="${selectedPoster.title}"
            />
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    const printImage =
      printWindow.document.getElementById(
        "print-poster"
      ) as HTMLImageElement | null;

    if (!printImage) {
      printWindow.close();
      return;
    }

    printImage.onload = () => {
      printWindow.focus();
      printWindow.print();
    };

    printWindow.onafterprint = () => {
      printWindow.close();
    };

    printImage.src = selectedPoster.image;
  };

  //--------------------------------------------------
  // Export
  //--------------------------------------------------

  const handleExport = () => {
    if (!selectedPoster) return;

    const link = document.createElement("a");
    link.href = selectedPoster.image;
    link.download = `${selectedPoster.title}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        onClick={handlePrint}
      />

      <ActionTile
        icon={Download}
        title="Export"
        onClick={handleExport}
      />
    </div>
  );

  //--------------------------------------------------
  // Render
  //--------------------------------------------------

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
              {isLoading ? (
                <div
                  style={{
                    padding: "4rem",
                    textAlign: "center",
                    color: "#666",
                  }}
                >
                  Loading poster…
                </div>
              ) : selectedPoster ? (
                <img
                  src={selectedPoster.image}
                  alt={selectedPoster.title}
                  style={{
                    width: "100%",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    padding: "4rem",
                    textAlign: "center",
                    color: "#666",
                  }}
                >
                  No poster selected
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}