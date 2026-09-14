// Revision: PDF poster thumbnail rendering for standalone Event Desk
// Poster files are stored in IndexedDB so large PDFs/images do not disappear.

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { Event } from "../types/Event";

import "./Posters.css";

import PageLayout from "../layout/PageLayout";
import SummaryCard from "../ui/SummaryCard";
import ActionTile from "../ui/ActionTile";
import {
  deletePoster,
  getPosterLibrary,
  savePoster,
  savePosterLibrary,
  type PosterItem,
} from "../posterStorage";

import {
  Upload,
  Eye,
  Link,
  Download,
  Replace,
  Trash2,
} from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

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

function PosterThumbnail({ poster }: { poster: PosterItem }) {
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [pdfFailed, setPdfFailed] = useState(false);

  const isPdf = poster.fileType.toUpperCase() === "PDF";

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;

    const renderPdfPreview = async () => {
      if (!isPdf) {
        setPdfPreview(null);
        setPdfFailed(false);
        return;
      }

      try {
        setPdfPreview(null);
        setPdfFailed(false);

        const pdfData = dataUrlToUint8Array(poster.image);
        loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Unable to create PDF poster preview canvas.");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        if (!cancelled) {
          setPdfPreview(canvas.toDataURL("image/png"));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to render PDF poster thumbnail", error);
          setPdfFailed(true);
        }
      }
    };

    void renderPdfPreview();

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [isPdf, poster.image]);

  if (!isPdf) {
    return (
      <img
        src={poster.image}
        alt={poster.title}
        className="poster-image"
      />
    );
  }

  if (pdfPreview) {
    return (
      <img
        src={pdfPreview}
        alt={`${poster.title} PDF preview`}
        className="poster-image"
      />
    );
  }

  return (
    <div
      className="poster-image"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "12px",
        boxSizing: "border-box",
        color: pdfFailed ? "#a33" : "#666",
        background: "#f5f7fa",
      }}
    >
      {pdfFailed ? "PDF preview unavailable" : "Rendering PDF…"}
    </div>
  );
}

interface PostersProps {
  event: Event;
  attachedPosterIds: string[];
  onPreview: (posterId: string) => void;
  onAttach: (posterIds: string[]) => void;
}

export default function Posters({
  event,
  attachedPosterIds,
  onPreview,
  onAttach,
}: PostersProps) {
  const [posters, setPosters] = useState<PosterItem[]>([]);
  const [selectedPosterId, setSelectedPosterId] =
    useState<string | null>(null);
  const [selectedPosterIds, setSelectedPosterIds] =
    useState<string[]>(attachedPosterIds);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPosters = async () => {
      try {
        const stored = await getPosterLibrary();
        if (cancelled) return;

        setPosters(stored);

        if (attachedPosterIds.length > 0) {
          setSelectedPosterIds(
            attachedPosterIds.filter((id) =>
              stored.some((poster) => poster.id === id)
            )
          );
        }
      } catch (error) {
        console.error("Failed to load poster library", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadPosters();

    return () => {
      cancelled = true;
    };
  }, [attachedPosterIds]);

  const selectedPoster =
    posters.find((p) => p.id === selectedPosterId) ?? null;

  const attachedCount = posters.filter(
    (p) => p.attachedEvent !== "Not Attached"
  ).length;

  const unattachedCount = posters.filter(
    (p) => p.attachedEvent === "Not Attached"
  ).length;

  const handleUploadClick = () => {
    setIsReplacing(false);
    fileInputRef.current?.click();
  };

  const handleReplaceClick = () => {
    if (!selectedPoster) return;

    setIsReplacing(true);
    fileInputRef.current?.click();
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read poster file."));
      reader.readAsDataURL(file);
    });

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? []);

    if (files.length === 0) {
      setIsReplacing(false);
      e.target.value = "";
      return;
    }

    try {
      if (isReplacing && selectedPosterId) {
        const file = files[0];
        const existingPoster = posters.find(
          (poster) => poster.id === selectedPosterId
        );

        if (!existingPoster) {
          setIsReplacing(false);
          return;
        }

        const image = await readFileAsDataUrl(file);
        const replacement: PosterItem = {
          ...existingPoster,
          fileType:
            file.name
              .split(".")
              .pop()
              ?.toUpperCase() ?? "",
          dateAdded: new Date().toLocaleDateString("en-GB"),
          image,
        };

        await savePoster(replacement);

        setPosters((current) =>
          current.map((poster) =>
            poster.id === selectedPosterId
              ? replacement
              : poster
          )
        );

        setIsReplacing(false);
      } else {
        const importedPosters: PosterItem[] = [];

        for (const file of files) {
          const image = await readFileAsDataUrl(file);

          importedPosters.push({
            id: crypto.randomUUID(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            fileType:
              file.name
                .split(".")
                .pop()
                ?.toUpperCase() ?? "",
            dateAdded: new Date().toLocaleDateString("en-GB"),
            attachedEvent: "Not Attached",
            image,
          });
        }

        for (const poster of importedPosters) {
          await savePoster(poster);
        }

        setPosters((current) => [
          ...current,
          ...importedPosters,
        ]);

        setSelectedPosterId(
          importedPosters[importedPosters.length - 1]?.id ?? null
        );
      }
    } catch (error) {
      console.error("Failed to save imported poster", error);
      window.alert(
        "One or more posters could not be saved. Please try again."
      );
      setIsReplacing(false);
    } finally {
      e.target.value = "";
    }
  };

  const togglePosterForAttachment = (posterId: string) => {
    setSelectedPosterIds((current) => {
      if (current.includes(posterId)) {
        return current.filter((id) => id !== posterId);
      }

      if (current.length >= 3) {
        window.alert(
          "An event can have a maximum of 3 posters."
        );
        return current;
      }

      return [...current, posterId];
    });
  };

  const handleDelete = async () => {
    if (!selectedPosterId) return;

    try {
      await deletePoster(selectedPosterId);

      setPosters((current) =>
        current.filter((p) => p.id !== selectedPosterId)
      );
      setSelectedPosterIds((current) =>
        current.filter((id) => id !== selectedPosterId)
      );
      setSelectedPosterId(null);
    } catch (error) {
      console.error("Failed to delete poster", error);
      window.alert(
        "The poster could not be deleted. Please try again."
      );
    }
  };

  const handleAttach = async () => {
    if (selectedPosterIds.length === 0) {
      window.alert("Select at least one poster to attach.");
      return;
    }

    const eventLabel =
      event.eventName.trim() ||
      `Event ${event.eventNumber}`;

    const updatedPosters = posters.map((poster) => {
      if (selectedPosterIds.includes(poster.id)) {
        return {
          ...poster,
          attachedEvent: eventLabel,
        };
      }

      if (attachedPosterIds.includes(poster.id)) {
        return {
          ...poster,
          attachedEvent: "Not Attached",
        };
      }

      return poster;
    });

    try {
      await savePosterLibrary(updatedPosters);
      setPosters(updatedPosters);
      onAttach(selectedPosterIds);
    } catch (error) {
      console.error(
        "Failed to save poster attachment",
        error
      );
      window.alert(
        "The poster attachment could not be saved. Please try again."
      );
    }
  };

  const summary = (
    <div className="page-summary">
      <SummaryCard
        title="Total Posters"
        value={String(posters.length)}
      />
      <SummaryCard
        title="Attached"
        value={String(attachedCount)}
      />
      <SummaryCard
        title="Unattached"
        value={String(unattachedCount)}
      />
      <SummaryCard
        title="Storage"
        value={`${posters.length} Files`}
      />
    </div>
  );

  const actions = (
    <div className="page-actions">
      <ActionTile
        icon={Upload}
        title="Import"
        primary
        onClick={handleUploadClick}
      />
      <ActionTile
        icon={Eye}
        title="Preview"
        onClick={() => {
          if (selectedPoster) {
            onPreview(selectedPoster.id);
          }
        }}
      />
      <ActionTile
        icon={Link}
        title="Attach"
        onClick={handleAttach}
      />
      <ActionTile
        icon={Download}
        title="Export"
        onClick={() => {
          if (!selectedPoster) {
            window.alert("Select a poster first.");
            return;
          }

          const extension =
            selectedPoster.fileType.toLowerCase() === "jpeg"
              ? "jpg"
              : selectedPoster.fileType.toLowerCase();

          const link = document.createElement("a");
          link.href = selectedPoster.image;
          link.download = `${selectedPoster.title}.${extension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
      />
      <ActionTile
        icon={Replace}
        title="Replace"
        onClick={handleReplaceClick}
      />
      <ActionTile
        icon={Trash2}
        title="Delete"
        onClick={handleDelete}
      />
    </div>
  );

  return (
    <PageLayout
      title="Poster Library"
      subtitle="Store, organise and attach up to 3 posters to your event."
      summary={summary}
      actions={actions}
      footer="Poster Library"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf"
        multiple={!isReplacing}
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />

      <div className="poster-library-page">
        <div className="poster-library-list">
          {isLoading && (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "#666",
              }}
            >
              Loading poster library…
            </div>
          )}

          {!isLoading &&
            posters.map((poster) => (
              <div
                key={poster.id}
                className={
                  selectedPosterId === poster.id
                    ? "poster-card selected"
                    : "poster-card"
                }
                onClick={() => setSelectedPosterId(poster.id)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px 0",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedPosterIds.includes(poster.id)}
                    onChange={() =>
                      togglePosterForAttachment(poster.id)
                    }
                    aria-label={`Include ${poster.title} in Event Media`}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#225ca8",
                      fontWeight: 700,
                    }}
                  >
                    Include in Event Media
                  </span>
                </div>

                <div className="poster-thumbnail">
                  <PosterThumbnail poster={poster} />
                </div>

                <div className="poster-details">
                  <h3>{poster.title}</h3>
                  <p>
                    <strong>File Type:</strong>{" "}
                    {poster.fileType}
                  </p>
                  <p>
                    <strong>Date Added:</strong>{" "}
                    {poster.dateAdded}
                  </p>
                  <p>
                    <strong>Attached Event:</strong>{" "}
                    {poster.attachedEvent}
                  </p>
                </div>
              </div>
            ))}

          {!isLoading && posters.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "#666",
              }}
            >
              No posters have been imported yet.
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
