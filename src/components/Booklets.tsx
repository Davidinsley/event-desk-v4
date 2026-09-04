// Booklets.tsx
// Ramsdale Seniors Event Desk
// Revision: Four-page A5 booklet builder with true A4 print preview

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
  const lines = text.split("\n");

  return lines.map((line, index) => (
    <span key={`${index}-${line}`}>
      {line || "\u00a0"}
      {index < lines.length - 1 && <br />}
    </span>
  ));
}

function PreviewText({ text, emptyText }: { text: string; emptyText: string }) {
  return text ? (
    <div className="preview-page-text">{formatPageText(text)}</div>
  ) : (
    <div className="preview-page-empty">{emptyText}</div>
  );
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
      updateField(importTarget, String(reader.result ?? ""));
      setImportTarget(null);
    };
    reader.onerror = () => setImportTarget(null);
    reader.readAsText(file);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      window.alert("Please allow pop-ups for Event Desk to print the booklet.");
      return;
    }

    const escapeHtml = (value: string) =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const textHtml = (value: string) =>
      escapeHtml(value).replace(/\r?\n/g, "<br />");

    const menuPage = data.includeMenu
      ? `
          <section class="page menu-page">
            <h2>MENU</h2>
            <div class="page-text">${textHtml(data.menu)}</div>
          </section>
        `
      : `<section class="page blank-page"></section>`;

    const coverPage = selectedPoster
      ? `
          <section class="page cover-page">
            <img src="${selectedPoster.image}" alt="Front cover" />
          </section>
        `
      : `<section class="page blank-page"></section>`;

    const orderPage = `
      <section class="page text-page">
        <h2>ORDER OF THE DAY</h2>
        <div class="page-text">${textHtml(data.orderOfDay)}</div>
      </section>
    `;

    const prizesPage = `
      <section class="page text-page">
        <h2>PRIZES &amp; DETAILS</h2>
        <div class="page-text">${textHtml(data.prizes)}</div>
      </section>
    `;

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(event.eventName || "Event Booklet")}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: white; }
            body { width: 210mm; font-family: Arial, Helvetica, sans-serif; }
            .sheet {
              width: 210mm;
              height: 296mm;
              display: flex;
              flex-direction: column;
              page-break-after: always;
              break-after: page;
              overflow: hidden;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .booklet {
              width: 210mm;
              height: 148mm;
              flex: 0 0 148mm;
              display: flex;
              overflow: hidden;
            }
            .page {
              width: 105mm;
              height: 148mm;
              flex: 0 0 105mm;
              overflow: hidden;
              position: relative;
              background: white;
              color: #1f2937;
              padding: 9mm 8mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
              text-align: center;
            }
            .cover-page {
              padding: 0;
              display: block;
            }
            .cover-page img {
              display: block;
              width: 105mm;
              height: 148mm;
              object-fit: cover;
            }
            h2 {
              margin: 0 0 7mm;
              padding-bottom: 3mm;
              border-bottom: 0.5mm solid #9ec5e8;
              color: #205b9f;
              font-size: 11pt;
              line-height: 1.15;
              text-align: center;
            }
            .page-text {
              font-size: 11pt;
              line-height: 1.35;
              white-space: pre-line;
              text-align: center;
            }
            .blank-page {
              background: white;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="booklet">${menuPage}${coverPage}</div>
            <div class="booklet">${menuPage}${coverPage}</div>
          </div>
          <div class="sheet">
            <div class="booklet">${orderPage}${prizesPage}</div>
            <div class="booklet">${orderPage}${prizesPage}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();

    const startPrint = () => {
      printWindow.focus();
      printWindow.print();
    };

    const coverImage = printWindow.document.querySelector<HTMLImageElement>(
      ".cover-page img",
    );

    if (coverImage && !coverImage.complete) {
      coverImage.addEventListener("load", startPrint, { once: true });
      coverImage.addEventListener("error", startPrint, { once: true });
    } else {
      window.setTimeout(startPrint, 250);
    }
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
            Four-page A5 event booklet — A4 landscape, double-sided and folded
            in half.
          </p>
        </div>

        <div className="booklets-actions">
          <button
            type="button"
            className="booklets-secondary-button"
            onClick={onBack}
          >
            ← Event Details
          </button>
          <button
            type="button"
            className="booklets-print-button"
            onClick={handlePrint}
          >
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
                placeholder={"STARTER\n...\n\nMAIN COURSE\n...\n\nDESSERT\n..."}
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
              <h2>Print Preview</h2>
              <p>What one booklet looks like. It will print twice — top and bottom — on each A4 sheet.</p>
            </div>
            <span className="print-note">A4 landscape • fold to A5</span>
          </div>

          <div className="print-preview-sheets">
            <div className="preview-sheet-group">
              <div className="preview-sheet-label">OUTSIDE — print side 1</div>
              <div className="preview-sheet">
                <div className="preview-half preview-menu">
                  <span className="preview-page-number">4</span>
                  {data.includeMenu ? (
                    <>
                      <h3>MENU</h3>
                      <PreviewText
                        text={data.menu}
                        emptyText="Enter the menu in Page 4."
                      />
                    </>
                  ) : (
                    <div className="preview-blank">Page 4 • Menu not required</div>
                  )}
                </div>

                <div className="preview-fold" />

                <div className="preview-half preview-cover">
                  <span className="preview-page-number light">1</span>
                  {selectedPoster ? (
                    <img src={selectedPoster.image} alt="Front cover preview" />
                  ) : (
                    <div className="preview-blank">No attached poster selected</div>
                  )}
                </div>
              </div>
            </div>

            <div className="preview-sheet-group">
              <div className="preview-sheet-label">INSIDE — print side 2</div>
              <div className="preview-sheet">
                <div className="preview-half preview-text-page">
                  <span className="preview-page-number">2</span>
                  <h3>ORDER OF THE DAY</h3>
                  <PreviewText
                    text={data.orderOfDay}
                    emptyText="Enter the Order of the Day in Page 2."
                  />
                </div>

                <div className="preview-fold" />

                <div className="preview-half preview-text-page">
                  <span className="preview-page-number">3</span>
                  <h3>PRIZES & DETAILS</h3>
                  <PreviewText
                    text={data.prizes}
                    emptyText="Enter the prize details in Page 3."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="preview-instruction">
            <strong>Print:</strong> A4 portrait • double-sided • 100% scale • two copies per sheet • short-edge flip.
          </div>
        </div>
      </div>

      <div className="print-booklet">
        <div className="print-sheet">
          <div className="print-page">
            {data.includeMenu ? (
              <>
                <h2>MENU</h2>
                <div className="print-text">{formatPageText(data.menu)}</div>
              </>
            ) : null}
          </div>

          <div className="print-page print-cover">
            {selectedPoster ? (
              <img src={selectedPoster.image} alt="Front cover" />
            ) : null}
          </div>
        </div>

        <div className="print-sheet">
          <div className="print-page">
            <h2>ORDER OF THE DAY</h2>
            <div className="print-text">{formatPageText(data.orderOfDay)}</div>
          </div>
          <div className="print-page">
            <h2>PRIZES & DETAILS</h2>
            <div className="print-text">{formatPageText(data.prizes)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
