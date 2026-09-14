// PosterPreview.tsx
// Revision: PDF-aware Poster Preview
// 14 September 2026

import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
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

// --------------------------------------------------
// PDF.js worker
// Same method already used successfully in Posters.tsx
// --------------------------------------------------

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// --------------------------------------------------
// Convert stored data URL into bytes for PDF.js
// --------------------------------------------------

const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
  const commaIndex = dataUrl.indexOf(",");

  if (commaIndex === -1) {
    throw new Error("Invalid poster data URL.");
  }

  const header = dataUrl.slice(0, commaIndex);
  const body = dataUrl.slice(commaIndex + 1);

  if (header.includes(";base64")) {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  return new TextEncoder().encode(decodeURIComponent(body));
};

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
  // Poster State
  //--------------------------------------------------

  const [selectedPoster, setSelectedPoster] =
    useState<PosterItem | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // For PDFs this contains the PNG generated from page 1.
  // For PNG/JPG posters it remains null.
  const [pdfPreview, setPdfPreview] =
    useState<string | null>(null);

  const [pdfFailed, setPdfFailed] = useState(false);

  //--------------------------------------------------
  // Poster Lookup
  //--------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadPoster = async () => {
      setIsLoading(true);

      try {
        const posters = await getPosterLibrary();

        if (cancelled) return;

        const poster =
          posters.find((item) => item.id === posterId) ?? null;

        setSelectedPoster(poster);
      } catch (error) {
        console.error(
          "Failed to load poster library for preview",
          error,
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
  // Render PDF poster to PNG for on-screen preview
  //--------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    let loadingTask:
      | ReturnType<typeof pdfjsLib.getDocument>
      | null = null;

    const renderPdfPreview = async () => {
      setPdfPreview(null);
      setPdfFailed(false);

      if (!selectedPoster) {
        return;
      }

      const isPdf =
        selectedPoster.fileType.toUpperCase() === "PDF";

      if (!isPdf) {
        return;
      }

      try {
        const pdfData =
          dataUrlToUint8Array(selectedPoster.image);

        loadingTask = pdfjsLib.getDocument({
          data: pdfData,
        });

        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        // Higher scale than thumbnail so full A4 preview is sharp.
        const viewport = page.getViewport({
          scale: 2,
        });

        const canvas =
          document.createElement("canvas");

        const context =
          canvas.getContext("2d");

        if (!context) {
          throw new Error(
            "Unable to create PDF poster preview canvas.",
          );
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        if (!cancelled) {
          setPdfPreview(
            canvas.toDataURL("image/png"),
          );
        }
      } catch (error) {
        console.error(
          "Failed to render PDF poster preview",
          error,
        );

        if (!cancelled) {
          setPdfFailed(true);
        }
      }
    };

    void renderPdfPreview();

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [selectedPoster]);

  //--------------------------------------------------
  // Determine image used for on-screen preview
  //--------------------------------------------------

  const isPdf =
    selectedPoster?.fileType.toUpperCase() === "PDF";

  const displayImage =
    selectedPoster && !isPdf
      ? selectedPoster.image
      : pdfPreview;

  //--------------------------------------------------
  // Print
  //--------------------------------------------------

  const handlePrint = () => {
    if (!selectedPoster) return;

    // For PDFs print the rendered page.
    // For image posters print the original image.
    const imageToPrint =
      isPdf ? pdfPreview : selectedPoster.image;

    if (!imageToPrint) {
      window.alert(
        "The poster preview is not ready to print yet.",
      );
      return;
    }

    const printWindow =
      window.open("", "_blank");

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
              height: 297mm;
              overflow: hidden;
              background: #ffffff;
            }

            .print-page {
              width: 210mm;
              height: 297mm;
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
        "print-poster",
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

    printImage.src = imageToPrint;
  };

  //--------------------------------------------------
  // Export
  //--------------------------------------------------

  const handleExport = () => {
    if (!selectedPoster) return;

    // Export the ORIGINAL poster file.
    // Therefore a PDF remains a PDF.
    const extension =
      selectedPoster.fileType.toLowerCase() === "jpeg"
        ? "jpg"
        : selectedPoster.fileType.toLowerCase();

    const link = document.createElement("a");

    link.href = selectedPoster.image;
    link.download =
      `${selectedPoster.title}.${extension}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  //--------------------------------------------------
  // Summary Cards
  //--------------------------------------------------

  const summary = (
    <div className="page-summary">
      <SummaryCard
        title="Template"
        value="Current"
      />

      <SummaryCard
        title="Preview"
        value="A4"
      />

      <SummaryCard
        title="Zoom"
        value={`${zoom}%`}
      />

      <SummaryCard
        title="Status"
        value="Draft"
      />
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
              ) : !selectedPoster ? (
                <div
                  style={{
                    padding: "4rem",
                    textAlign: "center",
                    color: "#666",
                  }}
                >
                  No poster selected
                </div>
              ) : isPdf && !displayImage && !pdfFailed ? (
                <div
                  style={{
                    padding: "4rem",
                    textAlign: "center",
                    color: "#666",
                  }}
                >
                  Rendering PDF…
                </div>
              ) : pdfFailed ? (
                <div
                  style={{
                    padding: "4rem",
                    textAlign: "center",
                    color: "#a33",
                  }}
                >
                  PDF preview unavailable
                </div>
              ) : displayImage ? (
                <img
                  src={displayImage}
                  alt={selectedPoster.title}
                  style={{
                    width: "100%",
                    display: "block",
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
