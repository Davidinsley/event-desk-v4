// Booklets.tsx
// Ramsdale Seniors Event Desk
// Revision: Four-page A5 booklet builder from one A4 landscape sheet

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Event } from "../types/Event";
import { getPosterLibrary, type PosterItem } from "../posterStorage";
import "./Booklets.css";

interface BookletsProps {
  event: Event;
  attachedPosterIds: string[];
  readOnly?: boolean;
  onBack: () => void;
}

interface BookletData {
  coverPosterId: string | null;
  orderOfDay: string;
  prizes: string;
  includeMenu: boolean;
  menu: string;
}

const BOOKLET_KEY_PREFIX = "eventDeskBookletV1:";

const createDefaultData = (attachedPosterIds: string[]): BookletData => ({
  coverPosterId: attachedPosterIds[0] ?? null,
  orderOfDay: "",
  prizes: "",
  includeMenu: false,
  menu: "",
});

const loadBookletData = (
  eventNumber: string,
  attachedPosterIds: string[],
): BookletData => {
  try {
    const saved = localStorage.getItem(
      `${BOOKLET_KEY_PREFIX}${eventNumber}`,
    );

    if (!saved) return createDefaultData(attachedPosterIds);

    const parsed = JSON.parse(saved) as Partial<BookletData>;

    return {
      coverPosterId:
        typeof parsed.coverPosterId === "string"
          ? parsed.coverPosterId
          : attachedPosterIds[0] ?? null,
      orderOfDay:
        typeof parsed.orderOfDay === "string" ? parsed.orderOfDay : "",
      prizes: typeof parsed.prizes === "string" ? parsed.prizes : "",
      includeMenu:
        typeof parsed.includeMenu === "boolean" ? parsed.includeMenu : false,
      menu: typeof parsed.menu === "string" ? parsed.menu : "",
    };
  } catch {
    return createDefaultData(attachedPosterIds);
  }
};

function formatPageText(text: string) {
  return text.split("\n").map((line, index) => (
    <span key={`${index}-${line}`}>
      {line || "\u00a0"}
      {index < text.split("\n").length - 1 && <br />}
    </span>
  ));
}

export default function Booklets({
  event,
  attachedPosterIds,
  readOnly = false,
  onBack,
}: BookletsProps) {
  const [posters, setPosters] = useState<PosterItem[]>([]);
  const [data, setData] = useState<BookletData>(() =>
    loadBookletData(event.eventNumber, attachedPosterIds),
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importTarget, setImportTarget] = useState<
    "orderOfDay" | "prizes" | "menu" | null
  >(null);

  useEffect(() => {
    setData(loadBookletData(event.eventNumber, attachedPosterIds));
  }, [event.eventNumber, attachedPosterIds]);

  useEffect(() => {
    getPosterLibrary()
      .then(setPosters)
      .catch((error) => {
        console.error("Failed to load poster library", error);
        setPosters([]);
      });
  }, []);

  useEffect(() => {
    if (readOnly) return;

    try {
      localStorage.setItem(
        `${BOOKLET_KEY_PREFIX}${event.eventNumber}`,
        JSON.stringify(data),
      );
    } catch (error) {
      console.error("Failed to save booklet data", error);
    }
  }, [data, event.eventNumber, readOnly]);

  const attachedPosters = useMemo(
    () =>
      attachedPosterIds
        .map((id) => posters.find((poster) => poster.id === id))
        .filter((poster): poster is PosterItem => Boolean(poster)),
    [attachedPosterIds, posters],
  );

  const selectedPoster =
    attachedPosters.find((poster) => poster.id === data.coverPosterId) ??
    attachedPosters[0] ??
    null;

  const updateField = <K extends keyof BookletData>(
    field: K,
    value: BookletData[K],
  ) => {
    if (readOnly) return;
    setData((current) => ({ ...current, [field]: value }));
  };

  const handleImportText = (target: "orderOfDay" | "prizes" | "menu") => {
    if (readOnly) return;
    setImportTarget(target);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file || !importTarget) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      updateField(importTarget, text);
      setImportTarget(null);
    };
    reader.onerror = () => setImportTarget(null);
    reader.readAsText(file);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="booklets-screen">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv"
        hidden
        onChange={handleFileSelected}
      />

      <div className="booklets-header no-print">
        <div>
          <h1>Booklet</h1>
          <p>
            Four-page A5 event booklet — print double-sided on one A4 landscape
            sheet and fold in half.
          </p>
        </div>

        <div className="booklets-actions">
          <button type="button" className="booklets-secondary-button" onClick={onBack}>
            ← Event Details
          </button>
          <button type="button" className="booklets-print-button" onClick={handlePrint}>
            🖨 Print Booklet
          </button>
        </div>
      </div>

      <div className="booklets-layout no-print">
        <div className="booklets-editor">
          <div className="booklet-panel">
            <div className="booklet-panel-heading">
              <div>
                <span className="booklet-panel-number">1</span>
                <div>
                  <h2>Front Cover</h2>
                  <p>Select one of this event's attached posters.</p>
                </div>
              </div>
            </div>

            {attachedPosters.length > 0 ? (
              <div className="poster-choice-grid">
                {attachedPosters.map((poster) => (
                  <button
                    type="button"
                    key={poster.id}
                    className={`poster-choice ${
                      selectedPoster?.id === poster.id ? "selected" : ""
                    }`}
                    onClick={() => updateField("coverPosterId", poster.id)}
                    disabled={readOnly}
                  >
                    <img src={poster.image} alt={poster.title} />
                    <span>{poster.title}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="booklet-empty-state">
                No poster is currently attached to this event. Attach a poster
                in Posters first.
              </div>
            )}
          </div>

          <div className="booklet-panel">
            <div className="booklet-panel-heading">
              <div>
                <span className="booklet-panel-number">2</span>
                <div>
                  <h2>Order of the Day</h2>
                  <p>Paste, type or import your itinerary.</p>
                </div>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  className="booklets-import-button"
                  onClick={() => handleImportText("orderOfDay")}
                >
                  Import Text
                </button>
              )}
            </div>
            <textarea
              value={data.orderOfDay}
              onChange={(e) => updateField("orderOfDay", e.target.value)}
              placeholder={
                "08:30  Arrival & Registration\n09:15  Welcome & Briefing\n10:00  First Tee Time\n..."
              }
              disabled={readOnly}
            />
          </div>

          <div className="booklet-panel">
            <div className="booklet-panel-heading">
              <div>
                <span className="booklet-panel-number">3</span>
                <div>
                  <h2>Prizes & Details</h2>
                  <p>Manually enter the prizes and any supporting details.</p>
                </div>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  className="booklets-import-button"
                  onClick={() => handleImportText("prizes")}
                >
                  Import Text
                </button>
              )}
            </div>
            <textarea
              value={data.prizes}
              onChange={(e) => updateField("prizes", e.target.value)}
              placeholder={
                "1st Prize — ...\n2nd Prize — ...\nNearest the Pin — ...\nOther prize details — ..."
              }
              disabled={readOnly}
            />
          </div>

          <div className="booklet-panel">
            <div className="booklet-panel-heading">
              <div>
                <span className="booklet-panel-number">4</span>
                <div>
                  <h2>Menu</h2>
                  <p>Optional page — enter the menu manually if required.</p>
                </div>
              </div>
              <label className="menu-toggle">
                <input
                  type="checkbox"
                  checked={data.includeMenu}
                  onChange={(e) => updateField("includeMenu", e.target.checked)}
                  disabled={readOnly}
                />
                <span>Include Menu</span>
              </label>
              {!readOnly && data.includeMenu && (
                <button
                  type="button"
                  className="booklets-import-button"
                  onClick={() => handleImportText("menu")}
                >
                  Import Text
                </button>
              )}
            </div>

            {data.includeMenu ? (
              <textarea
                value={data.menu}
                onChange={(e) => updateField("menu", e.target.value)}
                placeholder={
                  "STARTER\n...\n\nMAIN COURSE\n...\n\nDESSERT\n..."
                }
                disabled={readOnly}
              />
            ) : (
              <div className="booklet-menu-disabled">
                Page 4 will remain blank unless <strong>Include Menu</strong> is
                selected.
              </div>
            )}
          </div>
        </div>

        <div className="booklet-preview-area">
          <div className="booklet-preview-heading">
            <div>
              <h2>Booklet Preview</h2>
              <p>Logical page order: 1 → 2 → 3 → 4</p>
            </div>
            <span className="print-note">A5 portrait when folded</span>
          </div>

          <div className="logical-pages">
            <article className="logical-page cover-page">
              <span className="page-label">PAGE 1 • FRONT COVER</span>
              {selectedPoster ? (
                <img src={selectedPoster.image} alt={selectedPoster.title} />
              ) : (
                <div className="page-placeholder">No attached poster selected</div>
              )}
            </article>

            <article className="logical-page text-page">
              <span className="page-label">PAGE 2 • ORDER OF THE DAY</span>
              <h3>ORDER OF THE DAY</h3>
              <div className="page-text">
                {data.orderOfDay ? formatPageText(data.orderOfDay) : "Enter the itinerary above."}
              </div>
            </article>

            <article className="logical-page text-page">
              <span className="page-label">PAGE 3 • PRIZES & DETAILS</span>
              <h3>PRIZES & DETAILS</h3>
              <div className="page-text">
                {data.prizes ? formatPageText(data.prizes) : "Enter the prize details above."}
              </div>
            </article>

            <article className="logical-page text-page">
              <span className="page-label">PAGE 4 • MENU</span>
              {data.includeMenu ? (
                <>
                  <h3>MENU</h3>
                  <div className="page-text">
                    {data.menu ? formatPageText(data.menu) : "Enter the menu above."}
                  </div>
                </>
              ) : (
                <div className="page-placeholder">Menu not required</div>
              )}
            </article>
          </div>
        </div>
      </div>

      <div className="print-booklet no-screen">
        <div className="print-sheet">
          <div className="print-page">
            <span className="print-page-number">PAGE 4</span>
            {data.includeMenu ? (
              <>
                <h2>MENU</h2>
                <div className="print-text">{formatPageText(data.menu)}</div>
              </>
            ) : null}
          </div>
          <div className="print-page print-cover">
            <span className="print-page-number">PAGE 1</span>
            {selectedPoster ? (
              <img src={selectedPoster.image} alt="Front cover" />
            ) : null}
          </div>
        </div>

        <div className="print-sheet">
          <div className="print-page">
            <span className="print-page-number">PAGE 2</span>
            <h2>ORDER OF THE DAY</h2>
            <div className="print-text">{formatPageText(data.orderOfDay)}</div>
          </div>
          <div className="print-page">
            <span className="print-page-number">PAGE 3</span>
            <h2>PRIZES & DETAILS</h2>
            <div className="print-text">{formatPageText(data.prizes)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
