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
  onPreview: () => void;
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


export default function Posters({
  event,
  onPreview,
  onAttach,
}: PostersProps) {
  const [posters, setPosters] = useState<PosterItem[]>([]);

const fileInputRef = useRef<HTMLInputElement>(null);

const handleUploadClick = () => {
  fileInputRef.current?.click();
};

useEffect(() => {
  localStorage.setItem(
    "posterLibrary",
    JSON.stringify(posters)
  );
}, [posters]);


useEffect(() => {
  const saved = localStorage.getItem("posterLibrary");

  if (saved) {
    setPosters(JSON.parse(saved));
  }
}, []);


  const summary = (
    <div className="page-summary">

      <SummaryCard
        title="Total Posters"
        value={String(posters.length)}
      />

      <SummaryCard
        title="Attached"
        value={String(
          posters.filter(
            (p) => p.attachedEvent !== "Not Attached"
          ).length
        )}
      />

      <SummaryCard
        title="Unattached"
        value={String(
          posters.filter(
            (p) => p.attachedEvent === "Not Attached"
          ).length
        )}
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
        onClick={onPreview}
      />

      <ActionTile
  icon={Link}
  title="Attach"
  onClick={() => {
    const unattached = posters.find(
      (p) => p.attachedEvent === "Not Attached"
    );

    if (unattached) {
      onAttach(unattached.id);
    }
  }}
/>

      <ActionTile
        icon={Download}
        title="Export"
      />

      <ActionTile
        icon={Replace}
        title="Replace"
      />

      <ActionTile
        icon={Trash2}
        title="Delete"
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
  onChange={(event) => {
    const file = event.target.files?.[0];

   if (file) {
  const newPoster: PosterItem = {
  id: Date.now().toString(),
  title: file.name.replace(/\.[^/.]+$/, ""),
  image: URL.createObjectURL(file),
  fileType: file.name.split(".").pop()?.toUpperCase() ?? "",
  dateAdded: new Date().toLocaleDateString("en-GB"),
  attachedEvent: "Not Attached",
};


  setPosters((current) => [...current, newPoster]);
}
  }}
/>

      <div className="poster-library-page">

        <div className="poster-library-list">

            {posters.map((poster) => (

            <div
              key={poster.id}
              className="poster-card"
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
                  <strong>File Type:</strong> {poster.fileType}
                </p>

                <p>
                  <strong>Date Added:</strong> {poster.dateAdded}
                </p>

                <p>
                  <strong>Attached Event:</strong>{" "}
                  {poster.attachedEvent}
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>

    </PageLayout>

  );

}