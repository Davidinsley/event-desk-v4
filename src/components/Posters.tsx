import { useEffect, useRef, useState } from "react";
import type { Event } from "../types/Event";

import "./Posters.css";

import PageLayout from "../layout/PageLayout";
import SummaryCard from "../ui/SummaryCard";
import ActionTile from "../ui/ActionTile";

import {
  Upload,
  Eye,
  Link,
  Download,
  Replace,
  Trash2,
} from "lucide-react";

interface PostersProps {
  event: Event;
  onPreview: (posterId: string) => void;
  onAttach: (posterId: string) => void;
}

interface PosterItem {
  id: string;
  title: string;
  fileType: string;
  dateAdded: string;
  attachedEvent: string;
  image: string;
}

const STORAGE_KEY = "posterLibrary";

export default function Posters({
  event,
  onPreview,
  onAttach,
}: PostersProps) {
  const [posters, setPosters] = useState<PosterItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedPosterId, setSelectedPosterId] =
    useState<string | null>(null);

  const [isReplacing, setIsReplacing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(posters)
      );
    } catch (err) {
      console.error("Failed to save poster library", err);
    }
  }, [posters]);

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

  const handleFileSelected = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      setIsReplacing(false);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = reader.result as string;

      if (isReplacing && selectedPosterId) {
        setPosters((current) =>
          current.map((poster) =>
            poster.id === selectedPosterId
              ? {
                  ...poster,
                  fileType:
                    file.name
                      .split(".")
                      .pop()
                      ?.toUpperCase() ?? "",
                  dateAdded:
                    new Date().toLocaleDateString("en-GB"),
                  image,
                }
              : poster
          )
        );

        setIsReplacing(false);
      } else {
        const newPoster: PosterItem = {
          id: crypto.randomUUID(),
          title: file.name.replace(/\.[^/.]+$/, ""),
          fileType:
            file.name
              .split(".")
              .pop()
              ?.toUpperCase() ?? "",
          dateAdded:
            new Date().toLocaleDateString("en-GB"),
          attachedEvent: "Not Attached",
          image,
        };

        setPosters((current) => [
          ...current,
          newPoster,
        ]);

        setSelectedPosterId(newPoster.id);
      }
    };

    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const handleDelete = () => {
    if (!selectedPosterId) return;

    setPosters((current) =>
      current.filter(
        (p) => p.id !== selectedPosterId
      )
    );

    setSelectedPosterId(null);
  };

  const handleAttach = () => {
    if (!selectedPoster) return;

    onAttach(selectedPoster.id);
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
      subtitle="Store, organise and attach posters to your events."
      summary={summary}
      actions={actions}
      footer="Poster Library"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf"
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />

      <div className="poster-library-page">
        <div className="poster-library-list">

          {posters.map((poster) => (
            <div
              key={poster.id}
              className={
                selectedPosterId === poster.id
                  ? "poster-card selected"
                  : "poster-card"
              }
              onClick={() => {
                console.log(
                  "CARD CLICKED",
                  poster.id
                );
                setSelectedPosterId(poster.id);
              }}
            >
              <div className="poster-thumbnail">
                <img
                  src={poster.image}
                  alt={poster.title}
                  className="poster-image"
                />
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

          {posters.length === 0 && (
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