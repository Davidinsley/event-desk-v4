// Booklets.tsx
// Ramsdale Seniors Event Desk
// Revision: Competition booklet with PDF poster cover rendering, flip book, HTML/PDF export and print

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Event } from "../types/Event";
import type { Player } from "../types/Player";
import clubLogo from "../assets/Emblem.png";
import * as pdfjsLib from "pdfjs-dist";
import { getPosterLibrary, type PosterItem } from "../posterStorage";
import "./Booklets.css";

interface BookletsProps {
  event: Event;
  players?: Player[];
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

interface OpenBookletData {
  orderOfDay: string;
  prizes: string;
}

type BookletType = "special" | "open";

interface OpenStartGroup {
  group: string;
  teeTime: string;
  players: Player[];
}

const OPEN_BOOKLET_KEY_PREFIX = "eventDeskOpenBookletV1:";

const createDefaultOpenBookletData = (): OpenBookletData => ({
  orderOfDay: "",
  prizes: "",
});

const loadOpenBookletData = (eventNumber: string): OpenBookletData => {
  try {
    const saved = localStorage.getItem(
      `${OPEN_BOOKLET_KEY_PREFIX}${eventNumber}`,
    );

    if (!saved) return createDefaultOpenBookletData();

    const parsed = JSON.parse(saved) as Partial<OpenBookletData>;

    return {
      orderOfDay:
        typeof parsed.orderOfDay === "string" ? parsed.orderOfDay : "",
      prizes: typeof parsed.prizes === "string" ? parsed.prizes : "",
    };
  } catch {
    return createDefaultOpenBookletData();
  }
};

const isOpenEvent = (event: Event): boolean => {
  const extendedEvent = event as Event & Record<string, unknown>;
  const candidates = [
    event.eventName,
    event.competition,
    extendedEvent.eventType,
    extendedEvent.type,
    extendedEvent.category,
  ];

  return candidates.some(
    (value) =>
      typeof value === "string" &&
      /(^|\s)open(\s|$)/i.test(value.trim()),
  );
};

const formatOpenBookletDate = (value: string): string => {
  const raw = value.trim();
  if (!raw) return "";

  let parsed: Date | null = null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    parsed = new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3]),
    );
  } else {
    const ukMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (ukMatch) {
      let year = Number(ukMatch[3]);
      if (ukMatch[3].length === 2) year += year >= 70 ? 1900 : 2000;
      parsed = new Date(year, Number(ukMatch[2]) - 1, Number(ukMatch[1]));
    }
  }

  if (!parsed || Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const shortPlayerName = (player: Player): string => {
  const initial = player.firstName.trim().charAt(0).toUpperCase();
  const surname = player.lastName.trim();
  return `${initial ? `${initial}.` : ""}${surname}`.trim();
};

const getOpenTextFontSize = (value: string): number => {
  const length = value.trim().length;
  const lines = value.split(/\r?\n/).length;
  const weighted = Math.max(length, lines * 42);

  if (weighted <= 240) return 17;
  if (weighted <= 420) return 15;
  if (weighted <= 650) return 13;
  if (weighted <= 900) return 11.5;
  if (weighted <= 1200) return 10;
  return 8.8;
};

const BOOKLET_KEY_PREFIX = "eventDeskBookletV1:";
const ACTIVE_EVENT_ID_KEY = "eventDeskActiveEventId";
const CATERING_KEY_PREFIX = "eventDeskCateringV1:";
const MENU_PDF_DB = "eventDeskMenuPdfLibrary";
const MENU_PDF_STORE = "menus";

interface CateringLinkData {
  selectedPackage?: string;
  bespokeMenuPdfId?: string | null;
}

interface MenuPdfRecord {
  id: string;
  name: string;
  blob: Blob;
  addedAt: number;
}

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

function getSelectedMenuPdf(): Promise<MenuPdfRecord | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MENU_PDF_DB);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(MENU_PDF_STORE)) {
        db.close();
        resolve(null);
        return;
      }

      const tx = db.transaction(MENU_PDF_STORE, "readonly");
      const store = tx.objectStore(MENU_PDF_STORE);
      const getRequest = store.getAll();

      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };

      getRequest.onsuccess = () => {
        const records = getRequest.result as MenuPdfRecord[];
        const activeEventId = localStorage.getItem(ACTIVE_EVENT_ID_KEY);

        if (!activeEventId) {
          db.close();
          resolve(null);
          return;
        }

        let catering: CateringLinkData | null = null;
        try {
          const raw = localStorage.getItem(
            `${CATERING_KEY_PREFIX}${activeEventId}`,
          );
          catering = raw ? (JSON.parse(raw) as CateringLinkData) : null;
        } catch {
          catering = null;
        }

        if (catering?.selectedPackage !== "bespoke" || !catering.bespokeMenuPdfId) {
          db.close();
          resolve(null);
          return;
        }

        const selected =
          records.find((record) => record.id === catering?.bespokeMenuPdfId) ??
          null;
        db.close();
        resolve(selected);
      };
    };
  });
}

async function renderPdfFirstPageToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    page.cleanup();
    throw new Error("Unable to create a canvas for the catering menu PDF.");
  }

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  const dataUrl = canvas.toDataURL("image/png");
  page.cleanup();
  return dataUrl;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
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
}

function isPdfPoster(poster: PosterItem): boolean {
  return poster.fileType.toLowerCase().includes("pdf");
}

async function renderPosterPdfFirstPageToDataUrl(
  dataUrl: string,
): Promise<string> {
  const bytes = dataUrlToUint8Array(dataUrl);
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    page.cleanup();
    await loadingTask.destroy();
    throw new Error("Unable to create a canvas for the poster PDF.");
  }

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  const rendered = canvas.toDataURL("image/png");

  page.cleanup();
  await loadingTask.destroy();

  return rendered;
}

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

export default function Booklets({
  event,
  players = [],
  attachedPosterIds,
  readOnly = false,
  onBack,
}: BookletsProps) {
  const [posters, setPosters] = useState<PosterItem[]>([]);
  const [data, setData] = useState<BookletData>(() =>
    loadBookletData(event.eventNumber, attachedPosterIds),
  );
  const [openData, setOpenData] = useState<OpenBookletData>(() =>
    loadOpenBookletData(event.eventNumber),
  );
  const [bookletType, setBookletType] = useState<BookletType>(() =>
    isOpenEvent(event) ? "open" : "special",
  );
  const [clubLogoDataUrl, setClubLogoDataUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importTarget, setImportTarget] = useState<
    "orderOfDay" | "prizes" | "menu" | null
  >(null);
  const [cateringMenuImage, setCateringMenuImage] = useState<string | null>(null);
  const [cateringMenuError, setCateringMenuError] = useState<string | null>(null);
  const [posterPreviewImages, setPosterPreviewImages] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    setData(loadBookletData(event.eventNumber, attachedPosterIds));
  }, [event.eventNumber, attachedPosterIds]);

  useEffect(() => {
    setOpenData(loadOpenBookletData(event.eventNumber));
    setBookletType(isOpenEvent(event) ? "open" : "special");
  }, [event.eventNumber, event.eventName, event.competition]);

  useEffect(() => {
    let cancelled = false;

    fetch(clubLogo)
      .then((response) => response.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          }),
      )
      .then((dataUrl) => {
        if (!cancelled) setClubLogoDataUrl(dataUrl);
      })
      .catch((error) => {
        console.error("Failed to prepare club emblem for booklet export", error);
        if (!cancelled) setClubLogoDataUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (readOnly) return;

    try {
      localStorage.setItem(
        `${OPEN_BOOKLET_KEY_PREFIX}${event.eventNumber}`,
        JSON.stringify(openData),
      );
    } catch (error) {
      console.error("Failed to save Open booklet data", error);
    }
  }, [openData, event.eventNumber, readOnly]);

  const attachedPosters = useMemo(
    () =>
      attachedPosterIds
        .map((id) => posters.find((poster) => poster.id === id))
        .filter((poster): poster is PosterItem => Boolean(poster)),
    [attachedPosterIds, posters],
  );

  const openStartGroups = useMemo<OpenStartGroup[]>(() => {
    const registered = players.filter(
      (player) =>
        player.status === "Registered" &&
        Boolean(player.teeTime?.trim()) &&
        Boolean(player.group?.trim()),
    );

    const groupMap = new Map<string, OpenStartGroup>();

    registered.forEach((player) => {
      const group = player.group?.trim() ?? "";
      const teeTime = player.teeTime?.trim() ?? "";
      const existing = groupMap.get(group);

      if (existing) {
        existing.players.push(player);
        if (teeTime && (!existing.teeTime || teeTime < existing.teeTime)) {
          existing.teeTime = teeTime;
        }
      } else {
        groupMap.set(group, {
          group,
          teeTime,
          players: [player],
        });
      }
    });

    return Array.from(groupMap.values()).sort(
      (a, b) =>
        a.teeTime.localeCompare(b.teeTime, undefined, { numeric: true }) ||
        a.group.localeCompare(b.group, undefined, { numeric: true }),
    );
  }, [players]);

  const selectedPoster =
    attachedPosters.find((poster) => poster.id === data.coverPosterId) ??
    attachedPosters[0] ??
    null;

  useEffect(() => {
    let cancelled = false;

    const loadPosterPreviews = async () => {
      const entries = await Promise.all(
        attachedPosters.map(async (poster) => {
          if (!isPdfPoster(poster)) {
            return [poster.id, poster.image] as const;
          }

          try {
            const image = await renderPosterPdfFirstPageToDataUrl(poster.image);
            return [poster.id, image] as const;
          } catch (error) {
            console.error("Failed to render booklet PDF poster", error);
            return [poster.id, ""] as const;
          }
        }),
      );

      if (!cancelled) {
        const nextImages: Record<string, string> = {};
        entries.forEach(([id, image]) => {
          if (image) nextImages[id] = image;
        });
        setPosterPreviewImages(nextImages);
      }
    };

    void loadPosterPreviews();

    return () => {
      cancelled = true;
    };
  }, [attachedPosters]);

  const selectedPosterImage = selectedPoster
    ? posterPreviewImages[selectedPoster.id] ??
      (isPdfPoster(selectedPoster) ? null : selectedPoster.image)
    : null;

  useEffect(() => {
    let cancelled = false;

    setCateringMenuImage(null);
    setCateringMenuError(null);

    getSelectedMenuPdf()
      .then(async (record) => {
        if (!record) return;
        const image = await renderPdfFirstPageToDataUrl(record.blob);
        if (!cancelled) setCateringMenuImage(image);
      })
      .catch((error) => {
        console.error("Failed to load Catering menu PDF", error);
        if (!cancelled) {
          setCateringMenuError("The selected Catering menu PDF could not be loaded.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [event.eventNumber]);

  const updateField = <K extends keyof BookletData>(
    field: K,
    value: BookletData[K],
  ) => {
    if (readOnly) return;
    setData((current) => ({ ...current, [field]: value }));
  };

  const updateOpenField = <K extends keyof OpenBookletData>(
    field: K,
    value: OpenBookletData[K],
  ) => {
    if (readOnly) return;
    setOpenData((current) => ({ ...current, [field]: value }));
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


  const escapeOutputHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const outputTextHtml = (value: string) =>
    escapeOutputHtml(value || "—").replace(/\r?\n/g, "<br />");

  const buildOpenHeaderHtml = (pageTitle: string) => {
    const safeEventName = escapeOutputHtml(
      (event.eventName || "Seniors Open").toUpperCase(),
    );
    const safeDate = escapeOutputHtml(formatOpenBookletDate(event.eventDate));
    const logoHtml = clubLogoDataUrl
      ? `<img src="${clubLogoDataUrl}" alt="Ramsdale Park Golf Club" style="width:13mm;height:13mm;object-fit:contain;display:block;" />`
      : `<div style="width:13mm;height:13mm;border:0.5mm solid #2f6b45;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#2f6b45;font-size:6pt;font-weight:800;">RPGC</div>`;

    return `
      <div style="display:flex;align-items:center;justify-content:center;padding-bottom:1.4mm;border-bottom:0.5mm solid #7aa888;text-align:center;">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
          ${logoHtml}
          <div style="margin-top:0.3mm;">
            <div style="font-size:6.4pt;letter-spacing:0.45px;color:#2f6b45;font-weight:900;">RAMSDALE PARK GOLF CLUB</div>
            <div style="font-size:5.7pt;letter-spacing:0.3px;color:#5f7e69;font-weight:800;margin-top:0.15mm;">SENIORS SECTION</div>
          </div>
        </div>
      </div>
      <div style="text-align:center;padding:4mm 0 3.5mm;">
        <div style="font-size:12.5pt;line-height:1.05;color:#24583a;font-weight:900;letter-spacing:0.35px;">${safeEventName}</div>
        <div style="font-size:16pt;line-height:1.05;color:#1d4b30;font-weight:900;margin-top:1.8mm;">${escapeOutputHtml(pageTitle)}</div>
        ${
          safeDate
            ? `<div style="font-size:7.4pt;color:#66806d;font-weight:700;margin-top:1.8mm;">${safeDate}</div>`
            : ""
        }
      </div>
    `;
  };

  const buildOpenTeeTimesPageHtml = () => {
    const groups = openStartGroups.slice(0, 30);
    const padded: Array<OpenStartGroup | null> = Array.from(
      { length: 30 },
      (_, index) => groups[index] ?? null,
    );
    const left = padded.slice(0, 15);
    const right = padded.slice(15, 30);

    const rowsHtml = (rows: Array<OpenStartGroup | null>) =>
      rows
        .map((row, index) => {
          const displayNumber = row
            ? String(row.group || index + 1).padStart(2, "0")
            : "";
          const playerNames = row
            ? row.players
                .slice(0, 4)
                .map(shortPlayerName)
                .filter(Boolean)
            : [];

          const firstPlayerLine = playerNames.slice(0, 2).join(" / ");
          const secondPlayerLine = playerNames.slice(2, 4).join(" / ");

          return `
            <tr style="height:5.25mm;">
              <td style="width:9mm;padding:0.7mm 0.7mm;border-bottom:0.25mm solid #c8d9ce;font-weight:800;color:#28573a;font-size:6.1pt;white-space:nowrap;">${row ? escapeOutputHtml(row.teeTime) : ""}</td>
              <td style="width:6mm;padding:0.7mm 0.5mm;border-bottom:0.25mm solid #c8d9ce;text-align:center;font-weight:900;color:#1f4f33;font-size:6.1pt;">${escapeOutputHtml(displayNumber)}</td>
              <td style="padding:0.45mm 0.65mm;border-bottom:0.25mm solid #c8d9ce;color:#273d2f;font-size:5.5pt;line-height:1.18;font-weight:700;overflow:visible;">
                <div style="white-space:nowrap;">${escapeOutputHtml(firstPlayerLine)}</div>
                <div style="white-space:nowrap;">${escapeOutputHtml(secondPlayerLine)}</div>
              </td>
            </tr>
          `;
        })
        .join("");

    const tableHtml = (rows: Array<OpenStartGroup | null>) => `
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;border:0.35mm solid #9ebbaa;background:#ffffff;">
        <thead>
          <tr style="background:#e5f0e8;color:#214f33;">
            <th style="width:9mm;padding:1.1mm 0.7mm;border-bottom:0.45mm solid #7fa28b;font-size:6.1pt;text-align:left;">TIME</th>
            <th style="width:6mm;padding:1.1mm 0.5mm;border-bottom:0.45mm solid #7fa28b;font-size:6.1pt;text-align:center;">GRP</th>
            <th style="padding:1.1mm 0.65mm;border-bottom:0.45mm solid #7fa28b;font-size:6.1pt;text-align:left;">PLAYERS</th>
          </tr>
        </thead>
        <tbody>${rowsHtml(rows)}</tbody>
      </table>
    `;

    return `
      <section class="digital-page open-page" style="padding:4mm 6mm 3mm;background:linear-gradient(180deg,#f8fbf8 0%,#ffffff 34%);color:#263b2e;">
        ${buildOpenHeaderHtml("TEE TIMES")}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:3.2mm;align-items:start;">
          ${tableHtml(left)}
          ${tableHtml(right)}
        </div>
        
      </section>
    `;
  };

  const buildOpenTextPageHtml = (
    title: "ORDER OF THE DAY" | "PRIZES LIST",
    value: string,
  ) => {
    const safeText = outputTextHtml(value);
    const fontSize = getOpenTextFontSize(value);

    return `
      <section class="digital-page open-page" style="padding:6mm;background:linear-gradient(180deg,#f8fbf8 0%,#ffffff 34%);color:#263b2e;">
        ${buildOpenHeaderHtml(title)}
        <div style="height:102mm;display:flex;align-items:center;justify-content:center;padding:4mm 7mm 7mm;text-align:center;overflow:hidden;">
          <div style="width:100%;max-height:100%;overflow:hidden;white-space:normal;font-size:${fontSize}pt;line-height:1.34;color:#294334;font-weight:650;">${safeText}</div>
        </div>
        
      </section>
    `;
  };

  const buildDigitalPages = () => {
    const page1 = selectedPosterImage
      ? `
          <section class="digital-page cover-page">
            <img src="${selectedPosterImage}" alt="Front cover" />
          </section>
        `
      : `<section class="digital-page blank-page"><div class="missing-page">No front cover selected</div></section>`;

    if (bookletType === "open") {
      const page2 = buildOpenTeeTimesPageHtml();
      const page3 = buildOpenTextPageHtml(
        "ORDER OF THE DAY",
        openData.orderOfDay,
      );
      const page4 = buildOpenTextPageHtml(
        "PRIZES LIST",
        openData.prizes,
      );

      return [page1, page2, page3, page4];
    }

    const specialTextPage = (title: string, value: string) => {
      const fontSize = getOpenTextFontSize(value);

      return `
        <section class="digital-page text-page">
          <h2 style="text-align:center;">${title}</h2>
          <div style="height:102mm;display:flex;align-items:center;justify-content:center;padding:2mm 4mm 6mm;text-align:center;overflow:hidden;">
            <div class="page-text" style="width:100%;max-height:100%;overflow:hidden;white-space:normal;font-size:${fontSize}pt;line-height:1.34;font-weight:650;">${outputTextHtml(value)}</div>
          </div>
        </section>
      `;
    };

    const page2 = specialTextPage(
      "ORDER OF THE DAY",
      data.orderOfDay,
    );

    const page3 = specialTextPage(
      "PRIZES &amp; DETAILS",
      data.prizes,
    );

    const page4 = cateringMenuImage
      ? `
          <section class="digital-page menu-page catering-menu-page">
            <img src="${cateringMenuImage}" alt="Catering menu" />
          </section>
        `
      : data.includeMenu
        ? specialTextPage("MENU", data.menu)
        : `<section class="digital-page blank-page"><div class="missing-page">Menu not required</div></section>`;

    return [page1, page2, page3, page4];
  };

  const buildDigitalFlipBookHtml = () => {
    const pages = buildDigitalPages();
    const serializedPages = JSON.stringify(pages).replace(/</g, "\\u003c");
    const safeTitle = escapeOutputHtml(event.eventName || "Event Booklet");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${safeTitle} — Digital Booklet</title>
          <style>
            * { box-sizing: border-box; }

            html, body {
              margin: 0;
              width: 100%;
              min-height: 100%;
              font-family: Arial, Helvetica, sans-serif;
              background:
                radial-gradient(circle at top, #f7fbff 0%, #edf5fb 46%, #e4eef7 100%);
              color: #1f2937;
            }

            body {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
            }

            .flip-header {
              flex: 0 0 auto;
              padding: 18px 24px 10px;
              text-align: center;
            }

            .flip-header h1 {
              margin: 0;
              color: #205b9f;
              font-size: clamp(20px, 3vw, 30px);
            }

            .flip-header p {
              margin: 6px 0 0;
              color: #64748b;
              font-size: 14px;
            }

            .flip-stage {
              flex: 1 1 auto;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 0;
              padding: 12px 64px 24px;
              position: relative;
            }

            .book-shell {
              width: min(82vw, 500px);
              aspect-ratio: 105 / 148;
              perspective: 1800px;
              position: relative;
            }

            .book-page-wrap {
              width: 100%;
              height: 100%;
              position: absolute;
              inset: 0;
              transform-style: preserve-3d;
              transition: transform 420ms ease, opacity 260ms ease;
            }

            .book-page-wrap.turn-left {
              transform: rotateY(-10deg) translateX(-14px);
              opacity: 0;
            }

            .book-page-wrap.turn-right {
              transform: rotateY(10deg) translateX(14px);
              opacity: 0;
            }

            .book-page {
              width: 100%;
              height: 100%;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow:
                0 18px 50px rgba(32, 91, 159, 0.18),
                0 2px 8px rgba(0, 0, 0, 0.12);
              position: relative;
            }

            .book-page::after {
              content: "";
              position: absolute;
              inset: 0;
              pointer-events: none;
              box-shadow: inset -10px 0 22px rgba(32,91,159,0.05);
            }

            .scaled-page {
              position: absolute;
              left: 0;
              top: 0;
              width: 105mm;
              height: 148mm;
              transform-origin: top left;
              background: white;
            }

            .digital-page {
              width: 105mm;
              height: 148mm;
              overflow: hidden;
              position: relative;
              background: white;
              color: #1f2937;
              padding: 11mm;
            }

            .cover-page, .catering-menu-page {
              padding: 0;
            }

            .cover-page img,
            .catering-menu-page img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
            }

            .text-page h2,
            .menu-page h2 {
              margin: 0 0 5mm;
              padding-bottom: 2mm;
              border-bottom: 0.5mm solid #9ec5e8;
              color: #205b9f;
              font-size: 13pt;
            }

            .page-text {
              font-size: 8.5pt;
              line-height: 1.42;
            }

            .blank-page {
              padding: 0;
            }

            .missing-page {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              color: #64748b;
              padding: 10mm;
            }

            .nav-button {
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              width: 46px;
              height: 46px;
              border-radius: 50%;
              border: 1px solid #9ec5e8;
              background: rgba(255,255,255,0.95);
              color: #205b9f;
              font-size: 24px;
              font-weight: 800;
              cursor: pointer;
              box-shadow: 0 4px 14px rgba(32,91,159,0.12);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 5;
            }

            .nav-button:hover { background: #eef6ff; }
            .nav-button:disabled { opacity: 0.3; cursor: default; }
            .nav-prev { left: 12px; }
            .nav-next { right: 12px; }

            .flip-footer {
              flex: 0 0 auto;
              padding: 0 18px 22px;
              text-align: center;
            }

            .page-label {
              color: #205b9f;
              font-weight: 700;
              font-size: 14px;
              margin-bottom: 10px;
            }

            .dots {
              display: flex;
              gap: 8px;
              justify-content: center;
              align-items: center;
            }

            .dot {
              width: 10px;
              height: 10px;
              border-radius: 50%;
              border: 1px solid #5e92c5;
              background: white;
              padding: 0;
              cursor: pointer;
            }

            .dot.active { background: #2f6db5; }

            @media (max-width: 640px) {
              .flip-stage { padding-left: 48px; padding-right: 48px; }
              .nav-button { width: 38px; height: 38px; font-size: 20px; }
              .nav-prev { left: 6px; }
              .nav-next { right: 6px; }
            }
          </style>
        </head>

        <body>
          <header class="flip-header">
            <h1>${safeTitle}</h1>
            <p>Ramsdale Seniors digital event booklet</p>
          </header>

          <main class="flip-stage">
            <button id="prev" class="nav-button nav-prev" aria-label="Previous page">‹</button>

            <div class="book-shell">
              <div id="pageWrap" class="book-page-wrap">
                <div id="bookPage" class="book-page"></div>
              </div>
            </div>

            <button id="next" class="nav-button nav-next" aria-label="Next page">›</button>
          </main>

          <footer class="flip-footer">
            <div id="pageLabel" class="page-label"></div>
            <div id="dots" class="dots"></div>
          </footer>

          <script>
            var pages = ${serializedPages};
            var titles = ${
              bookletType === "open"
                ? `["Front Cover","Tee Times","Order of the Day","Prizes List"]`
                : `["Front Cover","Order of the Day","Prizes & Details","Menu"]`
            };
            var currentPage = 0;
            var pageWrap = document.getElementById("pageWrap");
            var bookPage = document.getElementById("bookPage");
            var prev = document.getElementById("prev");
            var next = document.getElementById("next");
            var pageLabel = document.getElementById("pageLabel");
            var dots = document.getElementById("dots");

            function fitPage() {
              var shell = document.querySelector(".book-shell");
              var scaled = document.querySelector(".scaled-page");
              if (!shell || !scaled) return;

              var baseWidth = 396.85;
              var baseHeight = 559.37;
              var scale = Math.min(
                shell.clientWidth / baseWidth,
                shell.clientHeight / baseHeight
              );

              scaled.style.transform = "scale(" + scale + ")";
            }

            function renderDots() {
              dots.innerHTML = "";
              pages.forEach(function (_, index) {
                var dot = document.createElement("button");
                dot.className = "dot" + (index === currentPage ? " active" : "");
                dot.setAttribute("aria-label", "Open page " + (index + 1));
                dot.addEventListener("click", function () {
                  showPage(index);
                });
                dots.appendChild(dot);
              });
            }

            function renderPage() {
              bookPage.innerHTML =
                '<div class="scaled-page">' + pages[currentPage] + "</div>";

              prev.disabled = currentPage === 0;
              next.disabled = currentPage === pages.length - 1;
              pageLabel.textContent =
                "Page " + (currentPage + 1) + " of " + pages.length +
                " — " + titles[currentPage];

              renderDots();
              requestAnimationFrame(fitPage);
            }

            function showPage(index) {
              if (index === currentPage || index < 0 || index >= pages.length) return;

              var direction = index > currentPage ? "turn-left" : "turn-right";
              pageWrap.classList.add(direction);

              setTimeout(function () {
                currentPage = index;
                renderPage();
                pageWrap.classList.remove("turn-left", "turn-right");
              }, 230);
            }

            prev.addEventListener("click", function () {
              showPage(currentPage - 1);
            });

            next.addEventListener("click", function () {
              showPage(currentPage + 1);
            });

            document.addEventListener("keydown", function (event) {
              if (event.key === "ArrowLeft") {
                showPage(currentPage - 1);
              }

              if (event.key === "ArrowRight" || event.key === " ") {
                event.preventDefault();
                showPage(currentPage + 1);
              }
            });

            window.addEventListener("resize", fitPage);
            renderPage();
          </script>
        </body>
      </html>
    `;
  };

  const handleOpenDigitalFlipBook = () => {
    const flipWindow = window.open("", "_blank", "width=980,height=820");

    if (!flipWindow) {
      window.alert(
        "Event Desk could not open the digital flip book. Please allow pop-ups and try again."
      );
      return;
    }

    flipWindow.document.write(buildDigitalFlipBookHtml());
    flipWindow.document.close();
  };

  const handleExportDigitalFlipBook = () => {
    const html = buildDigitalFlipBookHtml();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const safeName = (event.eventName || "Event-Booklet")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");

    link.href = url;
    link.download = `${safeName || "Event-Booklet"}-Flip-Book.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportPdf = () => {
    const [page1, page2, page3, page4] = buildDigitalPages();
    const pdfWindow = window.open("", "_blank", "width=900,height=900");

    if (!pdfWindow) {
      window.alert(
        "Event Desk could not open the PDF export window. Please allow pop-ups and try again."
      );
      return;
    }

    const safeTitle = escapeOutputHtml(event.eventName || "Event Booklet");

    pdfWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${safeTitle} — PDF</title>
          <style>
            @page { size: 105mm 148mm; margin: 0; }
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              background: white;
              font-family: Arial, Helvetica, sans-serif;
              color: #1f2937;
            }

            .pdf-page {
              width: 105mm;
              height: 148mm;
              margin: 0;
              overflow: hidden;
              break-after: page;
              page-break-after: always;
              background: white;
            }

            .pdf-page:last-child {
              break-after: auto;
              page-break-after: auto;
            }

            .digital-page {
              width: 105mm;
              height: 148mm;
              overflow: hidden;
              position: relative;
              background: white;
              color: #1f2937;
              padding: 11mm;
            }

            .cover-page, .catering-menu-page { padding: 0; }

            .cover-page img,
            .catering-menu-page img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
            }

            .text-page h2,
            .menu-page h2 {
              margin: 0 0 5mm;
              padding-bottom: 2mm;
              border-bottom: 0.5mm solid #9ec5e8;
              color: #205b9f;
              font-size: 13pt;
            }

            .page-text {
              font-size: 8.5pt;
              line-height: 1.42;
            }

            .blank-page { padding: 0; }

            .missing-page {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              color: #64748b;
              padding: 10mm;
            }

            @media screen {
              body { background: #e8eef5; padding: 18px 0; }
              .pdf-page {
                margin: 0 auto 20px;
                box-shadow: 0 4px 18px rgba(0,0,0,0.16);
              }
            }

            @media print {
              body { background: white; padding: 0; }
              .pdf-page { margin: 0; box-shadow: none; }
            }
          </style>
        </head>

        <body>
          <div class="pdf-page">${page1}</div>
          <div class="pdf-page">${page2}</div>
          <div class="pdf-page">${page3}</div>
          <div class="pdf-page">${page4}</div>

          <script>
            window.addEventListener("load", function () {
              var images = Array.from(document.images);

              Promise.all(
                images.map(function (img) {
                  if (img.complete) return Promise.resolve();
                  return new Promise(function (resolve) {
                    img.onload = resolve;
                    img.onerror = resolve;
                  });
                })
              ).then(function () {
                setTimeout(function () {
                  window.focus();
                  window.print();
                }, 350);
              });
            });

            window.addEventListener("afterprint", function () {
              setTimeout(function () {
                window.close();
              }, 150);
            });
          </script>
        </body>
      </html>
    `);

    pdfWindow.document.close();
  };

  const handlePrintOpen = () => {
    const [page1, page2, page3, page4] = buildDigitalPages();
    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      window.alert("Please allow pop-ups for Event Desk to print the Open booklet.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeOutputHtml(event.eventName || "Open Booklet")}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              background: white;
              width: 210mm;
              min-width: 210mm;
              font-family: Arial, Helvetica, sans-serif;
            }
            .sheet {
              width: 210mm;
              height: 296mm;
              position: relative;
              display: block;
              page-break-after: always;
              break-after: page;
              overflow: hidden;
            }
            .booklet-row {
              width: 210mm;
              height: 148mm;
              position: absolute;
              left: 0;
              display: flex;
              overflow: hidden;
            }
            .sheet .booklet-row:first-child { top: 0; }
            .sheet .booklet-row:last-child { top: 148mm; }
            .sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .digital-page {
              width: 105mm !important;
              height: 148mm !important;
              flex: 0 0 105mm;
              overflow: hidden;
              position: relative;
              background: white;
            }
            .cover-page { padding: 0 !important; }
            .cover-page img {
              display: block;
              width: 105mm;
              height: 148mm;
              object-fit: cover;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="booklet-row">${page4}${page1}</div>
            <div class="booklet-row">${page4}${page1}</div>
          </div>
          <div class="sheet">
            <div class="booklet-row">${page2}${page3}</div>
            <div class="booklet-row">${page2}${page3}</div>
          </div>
          <script>
            window.addEventListener("load", function () {
              var images = Array.from(document.images);
              Promise.all(
                images.map(function (img) {
                  if (img.complete) return Promise.resolve();
                  return new Promise(function (resolve) {
                    img.onload = resolve;
                    img.onerror = resolve;
                  });
                })
              ).then(function () {
                setTimeout(function () {
                  window.focus();
                  window.print();
                }, 350);
              });
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrint = () => {
    if (bookletType === "open") {
      handlePrintOpen();
      return;
    }

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

    const printTextPage = (title: string, value: string) => {
      const fontSize = getOpenTextFontSize(value);

      return `
        <section class="page text-page">
          <h2 style="text-align:center;">${title}</h2>
          <div style="height:102mm;display:flex;align-items:center;justify-content:center;padding:2mm 4mm 6mm;text-align:center;overflow:hidden;">
            <div class="page-text" style="width:100%;max-height:100%;overflow:hidden;white-space:normal;font-size:${fontSize}pt;line-height:1.34;font-weight:650;">${textHtml(value)}</div>
          </div>
        </section>
      `;
    };

    const menuPage = cateringMenuImage
      ? `
          <section class="page menu-page catering-menu-page">
            <img src="${cateringMenuImage}" alt="Catering menu" />
          </section>
        `
      : data.includeMenu
        ? printTextPage("MENU", data.menu)
        : `<section class="page blank-page"></section>`;

    const coverPage = selectedPosterImage
      ? `
          <section class="page cover-page">
            <img src="${selectedPosterImage}" alt="Front cover" />
          </section>
        `
      : `<section class="page blank-page"></section>`;

    const orderPage = printTextPage(
      "ORDER OF THE DAY",
      data.orderOfDay,
    );

    const prizesPage = printTextPage(
      "PRIZES &amp; DETAILS",
      data.prizes,
    );

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
            html, body { margin: 0; padding: 0; background: white; width: 210mm; height: auto; }
            body { width: 210mm; min-width: 210mm; font-family: Arial, Helvetica, sans-serif; }
            .sheet {
              width: 210mm;
              height: 296mm;
              position: relative;
              display: block;
              page-break-after: always;
              break-after: page;
              overflow: hidden;
            }
            .booklet-row {
              width: 210mm;
              height: 148mm;
              position: absolute;
              left: 0;
              display: flex;
              overflow: hidden;
            }
            .sheet:first-child .booklet-row:first-child { top: 0; }
            .sheet:first-child .booklet-row:last-child { top: 148mm; }
            .sheet:last-child .booklet-row:first-child { top: 0; }
            .sheet:last-child .booklet-row:last-child { top: 148mm; }
            .sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .page {
              width: 105mm;
              height: 148mm;
              flex: 0 0 105mm;
              overflow: hidden;
              position: relative;
              background: white;
              color: #1f2937;
              padding: 15mm;
            }
            .catering-menu-page {
              padding: 0;
            }
            .catering-menu-page img {
              display: block;
              width: 105mm;
              height: 148mm;
              object-fit: contain;
            }
            .cover-page { padding: 0; }
            .cover-page img {
              display: block;
              width: 105mm;
              height: 148mm;
              object-fit: cover;
            }
            h2 {
              margin: 0 0 6mm;
              padding-bottom: 2mm;
              border-bottom: 0.5mm solid #9ec5e8;
              color: #205b9f;
              font-size: 16pt;
            }
            .page-text {
              font-size: 9.5pt;
              line-height: 1.42;
              white-space: normal;
            }
            .blank-page { background: white; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="booklet-row">${menuPage}${coverPage}</div>
            <div class="booklet-row">${menuPage}${coverPage}</div>
          </div>
          <div class="sheet">
            <div class="booklet-row">${orderPage}${prizesPage}</div>
            <div class="booklet-row">${orderPage}${prizesPage}</div>
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
    const menuImage = printWindow.document.querySelector<HTMLImageElement>(
      ".catering-menu-page img",
    );

    let coverReady = !coverImage || coverImage.complete;
    let menuReady = !menuImage || menuImage.complete;
    let printStarted = false;

    const maybeStartPrint = () => {
      if (printStarted || !coverReady || !menuReady) return;
      printStarted = true;
      window.setTimeout(startPrint, 250);
    };

    if (coverImage && !coverImage.complete) {
      coverImage.addEventListener(
        "load",
        () => {
          coverReady = true;
          maybeStartPrint();
        },
        { once: true },
      );
      coverImage.addEventListener(
        "error",
        () => {
          coverReady = true;
          maybeStartPrint();
        },
        { once: true },
      );
    }

    if (menuImage && !menuImage.complete) {
      menuImage.addEventListener(
        "load",
        () => {
          menuReady = true;
          maybeStartPrint();
        },
        { once: true },
      );
      menuImage.addEventListener(
        "error",
        () => {
          menuReady = true;
          maybeStartPrint();
        },
        { once: true },
      );
    }

    maybeStartPrint();
  };

  const openEventAvailable = isOpenEvent(event);
  const openGroupsUsed = Math.min(openStartGroups.length, 34);
  const openPlayersUsed = openStartGroups
    .slice(0, 34)
    .reduce((total, group) => total + Math.min(group.players.length, 4), 0);

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
          <h1>Booklets</h1>
          <p>
            {bookletType === "open"
              ? "Purpose-built four-page Open booklet — two identical booklets per A4 sheet, double-sided."
              : "Four-page event booklet — two identical booklets per A4 sheet, double-sided."}
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
            className="booklets-secondary-button"
            onClick={handleOpenDigitalFlipBook}
          >
            📖 Open Flip Book
          </button>

          <button
            type="button"
            className="booklets-secondary-button"
            onClick={handleExportDigitalFlipBook}
          >
            ⬇️ Export Flip Book
          </button>

          <button
            type="button"
            className="booklets-secondary-button"
            onClick={handleExportPdf}
          >
            📄 Export PDF
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

      {openEventAvailable && (
        <div
          className="no-print"
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "18px",
            padding: "10px",
            border: "1px solid #dbe7f3",
            borderRadius: "12px",
            background: "#f8fbfd",
          }}
        >
          <button
            type="button"
            className="booklets-secondary-button"
            onClick={() => setBookletType("special")}
            style={
              bookletType === "special"
                ? {
                    background: "#2468b3",
                    color: "white",
                    borderColor: "#2468b3",
                  }
                : undefined
            }
          >
            Special Event Booklet
          </button>
          <button
            type="button"
            className="booklets-secondary-button"
            onClick={() => setBookletType("open")}
            style={
              bookletType === "open"
                ? {
                    background: "#2f6b45",
                    color: "white",
                    borderColor: "#2f6b45",
                  }
                : undefined
            }
          >
            Open Booklet
          </button>
        </div>
      )}

      <div className="booklets-layout no-print">
        {bookletType === "open" && openEventAvailable ? (
          <div className="booklets-editor open-booklets-editor">
            <div
              className="booklet-panel"
              style={{ borderColor: "#b7cfbe", boxShadow: "0 2px 8px rgba(47,107,69,0.08)" }}
            >
              <div className="booklet-panel-heading">
                <div>
                  <span
                    className="booklet-panel-number"
                    style={{ background: "#eaf3ed", color: "#2f6b45" }}
                  >
                    1
                  </span>
                  <div>
                    <h2 style={{ color: "#285b3c" }}>Advertising Poster / Front Cover</h2>
                    <p>Select one of this event&apos;s attached posters from the Poster Library.</p>
                  </div>
                </div>
              </div>

              {attachedPosters.length > 0 ? (
                <div className="poster-choice-grid">
                  {attachedPosters.map((poster) => {
                    const posterImage =
                      posterPreviewImages[poster.id] ??
                      (isPdfPoster(poster) ? null : poster.image);

                    return (
                      <button
                        type="button"
                        key={poster.id}
                        className={`poster-choice ${
                          selectedPoster?.id === poster.id ? "selected" : ""
                        }`}
                        onClick={() => updateField("coverPosterId", poster.id)}
                        disabled={readOnly}
                        style={
                          selectedPoster?.id === poster.id
                            ? { borderColor: "#3d7a52", boxShadow: "0 0 0 2px rgba(61,122,82,0.12)" }
                            : undefined
                        }
                      >
                        {posterImage ? (
                          <img src={posterImage} alt={poster.title} />
                        ) : (
                          <div
                            style={{
                              minHeight: "120px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "10px",
                              color: "#64748b",
                              textAlign: "center",
                            }}
                          >
                            Rendering PDF…
                          </div>
                        )}
                        <span>{poster.title}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="booklet-empty-state">
                  No poster is currently attached to this event. Attach a poster
                  in Posters first.
                </div>
              )}
            </div>

            <div
              className="booklet-panel"
              style={{ borderColor: "#b7cfbe", boxShadow: "0 2px 8px rgba(47,107,69,0.08)" }}
            >
              <div className="booklet-panel-heading">
                <div>
                  <span
                    className="booklet-panel-number"
                    style={{ background: "#eaf3ed", color: "#2f6b45" }}
                  >
                    2
                  </span>
                  <div>
                    <h2 style={{ color: "#285b3c" }}>Tee Times / Start Sheet</h2>
                    <p>Generated automatically from the current Players Start List.</p>
                  </div>
                </div>
              </div>

              <div
                style={{
                  minHeight: "132px",
                  border: "1px solid #c4d8ca",
                  borderRadius: "9px",
                  background: "#f7fbf8",
                  padding: "16px",
                  color: "#385a44",
                }}
              >
                <strong style={{ display: "block", fontSize: "16px", marginBottom: "8px" }}>
                  {openGroupsUsed} tee groups • {openPlayersUsed} players
                </strong>
                <span style={{ display: "block", lineHeight: 1.5 }}>
                  Groups 01–15 will print in the left column and Groups 16–30 in
                  the right column. Tee times and names refresh automatically whenever
                  the Start List changes.
                </span>
                {openStartGroups.length === 0 && (
                  <span
                    style={{
                      display: "block",
                      marginTop: "10px",
                      fontWeight: 700,
                      color: "#9a651f",
                    }}
                  >
                    No current Start List tee times are available yet.
                  </span>
                )}
                {openStartGroups.length > 30 && (
                  <span
                    style={{
                      display: "block",
                      marginTop: "10px",
                      fontWeight: 700,
                      color: "#9a3d2f",
                    }}
                  >
                    This Open Booklet supports a maximum of 30 groups / 120 players.
                    Only the first 30 groups will be printed.
                  </span>
                )}
              </div>
            </div>

            <div
              className="booklet-panel"
              style={{ borderColor: "#b7cfbe", boxShadow: "0 2px 8px rgba(47,107,69,0.08)" }}
            >
              <div className="booklet-panel-heading">
                <div>
                  <span
                    className="booklet-panel-number"
                    style={{ background: "#eaf3ed", color: "#2f6b45" }}
                  >
                    3
                  </span>
                  <div>
                    <h2 style={{ color: "#285b3c" }}>Order of the Day</h2>
                    <p>Enter the wording exactly as you want it centred on Page 3.</p>
                  </div>
                </div>
              </div>
              <textarea
                value={openData.orderOfDay}
                onChange={(e) => updateOpenField("orderOfDay", e.target.value)}
                placeholder={
                  "Registration from 08:00\nFirst tee time 08:30\nMeal and prize presentation after play\n..."
                }
                disabled={readOnly}
                style={{ minHeight: "170px", height: "170px", textAlign: "center" }}
              />
            </div>

            <div
              className="booklet-panel"
              style={{ borderColor: "#b7cfbe", boxShadow: "0 2px 8px rgba(47,107,69,0.08)" }}
            >
              <div className="booklet-panel-heading">
                <div>
                  <span
                    className="booklet-panel-number"
                    style={{ background: "#eaf3ed", color: "#2f6b45" }}
                  >
                    4
                  </span>
                  <div>
                    <h2 style={{ color: "#285b3c" }}>Prizes List</h2>
                    <p>Enter the final prize list manually; the booklet will centre and size it automatically.</p>
                  </div>
                </div>
              </div>
              <textarea
                value={openData.prizes}
                onChange={(e) => updateOpenField("prizes", e.target.value)}
                placeholder={
                  "1st Team — ...\n2nd Team — ...\nNearest the Pin — ...\nHole in One — ..."
                }
                disabled={readOnly}
                style={{ minHeight: "170px", height: "170px", textAlign: "center" }}
              />
            </div>
          </div>
        ) : (
          <div className="booklets-editor">
            <div className="booklet-panel">
              <div className="booklet-panel-heading">
                <div>
                  <span className="booklet-panel-number">1</span>
                  <div>
                    <h2>Front Cover</h2>
                    <p>Select one of this event&apos;s attached posters.</p>
                  </div>
                </div>
              </div>

              {attachedPosters.length > 0 ? (
                <div className="poster-choice-grid">
                  {attachedPosters.map((poster) => {
                    const posterImage =
                      posterPreviewImages[poster.id] ??
                      (isPdfPoster(poster) ? null : poster.image);

                    return (
                      <button
                        type="button"
                        key={poster.id}
                        className={`poster-choice ${
                          selectedPoster?.id === poster.id ? "selected" : ""
                        }`}
                        onClick={() => updateField("coverPosterId", poster.id)}
                        disabled={readOnly}
                      >
                        {posterImage ? (
                          <img src={posterImage} alt={poster.title} />
                        ) : (
                          <div
                            style={{
                              minHeight: "120px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "10px",
                              color: "#64748b",
                              textAlign: "center",
                            }}
                          >
                            Rendering PDF…
                          </div>
                        )}
                        <span>{poster.title}</span>
                      </button>
                    );
                  })}
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
                    <p>Uses the selected Catering Bespoke menu automatically when available.</p>
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

              {cateringMenuImage ? (
                <div className="booklet-menu-disabled">
                  The selected Catering Bespoke menu will be used automatically for Page 4.
                </div>
              ) : data.includeMenu ? (
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
              {cateringMenuError ? (
                <div className="booklet-menu-disabled">{cateringMenuError}</div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}