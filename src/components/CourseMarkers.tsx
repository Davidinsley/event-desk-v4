// CourseMarkers.tsx
// Event Desk V4
// Milestone 3E.6: Course Marker configuration + duplex A4 Preview + PDF Export + direct browser print
//
// Supports:
// - Nearest the Pin
// - Longest Drive
// - Nearest the Line
// - Hole 1–18
// - Open / Men Only / Ladies Only
// - Maximum 18 markers
// - Per-event persistence
// - Four marker forms per A4 portrait sheet
// - 10 player name entries on front of each form
// - Front preview rows 1–10
// - Reverse preview rows 11–25
// - Front / Reverse duplex preview
// - Duplex-ready PDF export: front then horizontally mirrored reverse for each sheet
//
// Print Forms uses the same browser print-window method already proven in Event Desk Booklets.

import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import type { Event } from "../types/Event";

type MarkerType =
  | "Nearest the Pin"
  | "Longest Drive"
  | "Nearest the Line";

type Eligibility =
  | "Open"
  | "Men Only"
  | "Ladies Only";

interface CourseMarker {
  id: string;
  type: MarkerType;
  hole: number;
  eligibility: Eligibility;
}

interface CourseMarkersProps {
  event: Event;
}

const MAX_MARKERS = 18;
const MARKERS_PER_SHEET = 4;
const FRONT_NAME_ROWS = 10;

const SENIORS_EMBLEM = "data:image/jpeg;base64,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";

export default function CourseMarkers({
  event,
}: CourseMarkersProps) {
  const storageKey =
    `eventDeskCourseMarkers-${event.eventNumber}`;

  const [markers, setMarkers] = useState<CourseMarker[]>(
    () => {
      try {
        const saved =
          localStorage.getItem(storageKey);

        if (!saved) return [];

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed)
          ? parsed
          : [];
      } catch (error) {
        console.error(
          "Failed to load Course Markers",
          error
        );

        return [];
      }
    }
  );

  const [showPreview, setShowPreview] =
    useState(false);

  const [previewPage, setPreviewPage] =
    useState(0);

  const [previewSide, setPreviewSide] =
    useState<"front" | "reverse">("front");

  const [genericQuantity, setGenericQuantity] =
    useState<4 | 8 | 12 | 16>(4);

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(storageKey);

      if (!saved) {
        setMarkers([]);
        return;
      }

      const parsed = JSON.parse(saved);

      setMarkers(
        Array.isArray(parsed)
          ? parsed
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load Course Markers",
        error
      );

      setMarkers([]);
    }

    setShowPreview(false);
    setPreviewPage(0);
    setPreviewSide("front");
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(markers)
      );
    } catch (error) {
      console.error(
        "Failed to save Course Markers",
        error
      );
    }
  }, [markers, storageKey]);

  const formatEventDate = (
    value: string
  ) => {
    if (!value) {
      return "Date not yet entered";
    }

    const ukMatch = value.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

    if (ukMatch) {
      const day = Number(ukMatch[1]);
      const month = Number(ukMatch[2]);
      const year = Number(ukMatch[3]);

      const date = new Date(
        year,
        month - 1,
        day
      );

      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString(
          "en-GB",
          {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }
        );
      }
    }

    const isoMatch = value.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    );

    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);

      const date = new Date(
        year,
        month - 1,
        day
      );

      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString(
          "en-GB",
          {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }
        );
      }
    }

    return value;
  };

  const handleAddMarker = () => {
    if (markers.length >= MAX_MARKERS) {
      window.alert(
        "A maximum of 18 Course Markers can be added to an event."
      );
      return;
    }

    const newMarker: CourseMarker = {
      id:
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID ===
          "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${markers.length}`,

      type: "Nearest the Pin",
      hole: 1,
      eligibility: "Open",
    };

    setMarkers((current) => [
      ...current,
      newMarker,
    ]);
  };

  const handleDeleteMarker = (
    markerId: string
  ) => {
    setMarkers((current) =>
      current.filter(
        (marker) =>
          marker.id !== markerId
      )
    );
  };

  const handleTypeChange = (
    markerId: string,
    type: MarkerType
  ) => {
    setMarkers((current) =>
      current.map((marker) =>
        marker.id === markerId
          ? { ...marker, type }
          : marker
      )
    );
  };

  const handleHoleChange = (
    markerId: string,
    hole: number
  ) => {
    setMarkers((current) =>
      current.map((marker) =>
        marker.id === markerId
          ? { ...marker, hole }
          : marker
      )
    );
  };

  const handleEligibilityChange = (
    markerId: string,
    eligibility: Eligibility
  ) => {
    setMarkers((current) =>
      current.map((marker) =>
        marker.id === markerId
          ? {
              ...marker,
              eligibility,
            }
          : marker
      )
    );
  };

  const holeOptions = Array.from(
    { length: 18 },
    (_, index) => index + 1
  );

  const previewSheets: CourseMarker[][] =
    [];

  for (
    let i = 0;
    i < markers.length;
    i += MARKERS_PER_SHEET
  ) {
    previewSheets.push(
      markers.slice(
        i,
        i + MARKERS_PER_SHEET
      )
    );
  }

  const totalPreviewPages =
    previewSheets.length;

  const currentPreviewMarkers =
    previewSheets[previewPage] || [];

  const previewSlots: (
    | CourseMarker
    | null
  )[] = Array.from(
    { length: MARKERS_PER_SHEET },
    (_, index) =>
      currentPreviewMarkers[index] ||
      null
  );

  const exportPdf = () => {
    if (markers.length === 0) {
      window.alert(
        "Add at least one Course Marker before exporting the PDF."
      );
      return;
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const formWidth = pageWidth / 2;
    const formHeight = pageHeight / 2;

    const drawForm = (
      marker: CourseMarker | null,
      slotIndex: number,
      side: "front" | "reverse"
    ) => {
      const column = slotIndex % 2;
      const row = Math.floor(slotIndex / 2);
      const x = column * formWidth;
      const y = row * formHeight;

      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.25);
      if (column === 0) {
        pdf.setLineDashPattern([1.5, 1.5], 0);
        pdf.line(formWidth, y, formWidth, y + formHeight);
      }
      if (row === 0) {
        pdf.setLineDashPattern([1.5, 1.5], 0);
        pdf.line(x, formHeight, x + formWidth, formHeight);
      }
      pdf.setLineDashPattern([], 0);

      if (!marker) return;

      const centreX = x + formWidth / 2;
      const left = x + 5.2;
      const right = x + formWidth - 5.2;
      const tableWidth = right - left;
      const numberWidth = 11;

      let tableTop: number;
      let firstNumber: number;
      let rowCount: number;
      let rowHeight: number;

      if (side === "front") {
        // Identification belongs on the front only.
        pdf.addImage(SENIORS_EMBLEM, "JPEG", x + 4.5, y + 4.5, 12, 12);
        pdf.setTextColor(51, 65, 85);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.text(
          event.eventName || "Untitled Event",
          centreX,
          y + 10,
          { align: "center", maxWidth: formWidth - 12 }
        );

        pdf.setTextColor(100, 116, 139);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.text(
          formatEventDate(event.eventDate),
          centreX,
          y + 19,
          { align: "center" }
        );

        pdf.setTextColor(32, 91, 159);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text(
          marker.type.toUpperCase(),
          centreX,
          y + 29,
          { align: "center" }
        );

        pdf.setTextColor(17, 24, 39);
        pdf.setFontSize(12);
        pdf.text(
          `HOLE ${marker.hole}`,
          centreX,
          y + 37,
          { align: "center" }
        );

        pdf.setTextColor(51, 65, 85);
        pdf.setFontSize(7);
        pdf.text(
          marker.eligibility.toUpperCase(),
          centreX,
          y + 43,
          { align: "center" }
        );

        tableTop = y + 48;
        firstNumber = 1;
        rowCount = FRONT_NAME_ROWS;
        rowHeight = 6.6;
      } else {
        pdf.setTextColor(185, 28, 28);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text(
          "THIS SIDE IS FOR CONTINUATION ONLY",
          centreX,
          y + 14,
          { align: "center", maxWidth: formWidth - 12 }
        );

        pdf.setTextColor(17, 24, 39);
        pdf.setFontSize(9);
        pdf.text(
          "PLEASE USE ONLY WHEN THE FRONT PAGE IS FULL",
          centreX,
          y + 22,
          { align: "center", maxWidth: formWidth - 12 }
        );

        tableTop = y + 28;
        firstNumber = 11;
        rowCount = 15;
        rowHeight = 6.7;
      }

      const headerHeight = 7;
      const tableHeight = headerHeight + rowCount * rowHeight;

      pdf.setDrawColor(71, 85, 105);
      pdf.setLineWidth(0.25);
      pdf.rect(left, tableTop, tableWidth, tableHeight);

      pdf.setFillColor(234, 242, 251);
      pdf.rect(left, tableTop, tableWidth, headerHeight, "F");
      pdf.line(
        left + numberWidth,
        tableTop,
        left + numberWidth,
        tableTop + tableHeight
      );
      pdf.line(
        left,
        tableTop + headerHeight,
        right,
        tableTop + headerHeight
      );

      pdf.setTextColor(51, 65, 85);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.2);
      pdf.text(
        "No.",
        left + numberWidth / 2,
        tableTop + 4.7,
        { align: "center" }
      );
      pdf.text(
        "NAME (PLEASE PRINT)",
        left + numberWidth + 2.5,
        tableTop + 4.7
      );

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);

      for (let index = 0; index < rowCount; index += 1) {
        const rowY =
          tableTop + headerHeight + index * rowHeight;
        if (index > 0) {
          pdf.setDrawColor(148, 163, 184);
          pdf.line(left, rowY, right, rowY);
        }
        pdf.text(
          String(firstNumber + index),
          left + numberWidth / 2,
          rowY + rowHeight * 0.67,
          { align: "center" }
        );
      }

      if (side === "front") {
        pdf.setTextColor(148, 163, 184);
        pdf.setFontSize(6.5);
        pdf.text(
          "Name list continues on reverse",
          centreX,
          y + formHeight - 4,
          { align: "center" }
        );
      }
    };

    previewSheets.forEach((sheetMarkers, sheetIndex) => {
      const slots: (CourseMarker | null)[] = Array.from(
        { length: MARKERS_PER_SHEET },
        (_, index) => sheetMarkers[index] || null
      );

      if (sheetIndex > 0) {
        pdf.addPage();
      }
      slots.forEach((marker, slotIndex) =>
        drawForm(marker, slotIndex, "front")
      );

      pdf.addPage();

      // Mirror the reverse page horizontally for physical duplex printing.
      // Front slots 0|1 and 2|3 become reverse slots 1|0 and 3|2,
      // so each marker backs its own front after the sheet is turned over.
      const reverseSlots = [
        slots[1],
        slots[0],
        slots[3],
        slots[2],
      ];

      reverseSlots.forEach((marker, slotIndex) =>
        drawForm(marker, slotIndex, "reverse")
      );
    });

    const safeEventName = (
      event.eventName || "Course-Markers"
    )
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");

    pdf.save(`${safeEventName}-Course-Markers.pdf`);
  };

  const handlePrintForms = () => {
    if (markers.length === 0) {
      window.alert(
        "Add at least one Course Marker before printing the forms."
      );
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      window.alert(
        "Please allow pop-ups for Event Desk to print the Course Marker forms."
      );
      return;
    }

    const escapeHtml = (value: string) =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const buildNameTable = (firstNumber: number, rowCount: number) => {
      const rows = Array.from({ length: rowCount }, (_, index) =>
        `<div class="name-row"><div class="number-cell">${firstNumber + index}</div><div></div></div>`
      ).join("");

      return `
        <div class="name-table">
          <div class="name-header"><div class="number-cell">No.</div><div class="name-title">NAME (PLEASE PRINT)</div></div>
          ${rows}
        </div>
      `;
    };

    const buildForm = (marker: CourseMarker | null, side: "front" | "reverse") => {
      if (!marker) return `<div class="marker-form blank-form"></div>`;

      const eventName = escapeHtml(event.eventName || "Untitled Event");
      const markerType = escapeHtml(marker.type.toUpperCase());
      const eligibility = escapeHtml(marker.eligibility.toUpperCase());
      const hole = escapeHtml(String(marker.hole));
      const emblem = `<img class="marker-emblem" src="${SENIORS_EMBLEM}" alt="Ramsdale Seniors emblem" />`;

      if (side === "front") {
        return `
          <div class="marker-form">
            ${emblem}
            <div class="event-name">${eventName}</div>
            <div class="event-date">${escapeHtml(formatEventDate(event.eventDate))}</div>
            <div class="marker-type">${markerType}</div>
            <div class="hole">HOLE ${hole}</div>
            <div class="eligibility">${eligibility}</div>
            ${buildNameTable(1, FRONT_NAME_ROWS)}
            <div class="continue-note">Name list continues on reverse</div>
          </div>
        `;
      }

      return `
        <div class="marker-form reverse-form">
          <div class="reverse-warning-primary">THIS SIDE IS FOR CONTINUATION ONLY</div>
          <div class="reverse-warning-secondary">PLEASE USE ONLY WHEN THE FRONT PAGE IS FULL</div>
          ${buildNameTable(11, 15)}
        </div>
      `;
    };

    const sheetsHtml = previewSheets
      .map((sheetMarkers) => {
        const slots: (CourseMarker | null)[] = Array.from(
          { length: MARKERS_PER_SHEET },
          (_, index) => sheetMarkers[index] || null
        );
        const reverseSlots = [slots[1], slots[0], slots[3], slots[2]];

        const front = slots
          .map((marker) => buildForm(marker, "front"))
          .join("");
        const reverse = reverseSlots
          .map((marker) => buildForm(marker, "reverse"))
          .join("");

        return `<div class="sheet">${front}</div><div class="sheet">${reverse}</div>`;
      })
      .join("");

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(event.eventName || "Course Markers")}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: white; font-family: Arial, Helvetica, sans-serif; }
            .sheet {
              width: 210mm;
              height: 296mm;
              display: grid;
              grid-template-columns: 105mm 105mm;
              grid-template-rows: 148mm 148mm;
              page-break-after: always;
              break-after: page;
              overflow: hidden;
            }
            .sheet:last-child { page-break-after: auto; break-after: auto; }
            .marker-form {
              width: 105mm;
              height: 148mm;
              position: relative;
              overflow: hidden;
              padding: 4.5mm 5.2mm 4mm;
              border-right: 0.25mm dashed #94a3b8;
              border-bottom: 0.25mm dashed #94a3b8;
              color: #334155;
            }
            .marker-form:nth-child(2n) { border-right: 0; }
            .marker-form:nth-child(n+3) { border-bottom: 0; }
            .marker-emblem { position: absolute; left: 4.5mm; top: 4.5mm; width: 12mm; height: 12mm; object-fit: contain; }
            .event-name { text-align: center; font-size: 10.5pt; line-height: 1.1; font-weight: 700; min-height: 7mm; padding: 0 9mm; }
            .event-date { text-align: center; margin-top: 1.5mm; color: #64748b; font-size: 7.5pt; }
            .marker-type { text-align: center; margin-top: 4mm; color: #205b9f; font-size: 14pt; font-weight: 800; line-height: 1; }
            .hole { text-align: center; margin-top: 2.2mm; color: #111827; font-size: 12pt; font-weight: 800; }
            .eligibility { text-align: center; margin-top: 1.5mm; font-size: 7pt; font-weight: 800; }
            .reverse-warning-primary { text-align: center; margin-top: 2mm; color: #b91c1c; font-size: 11.5pt; font-weight: 900; line-height: 1.05; }
            .reverse-warning-secondary { text-align: center; margin-top: 2mm; color: #111827; font-size: 8.5pt; font-weight: 900; line-height: 1.1; }
            .name-table { margin-top: 2.5mm; border: 0.25mm solid #475569; }
            .name-header, .name-row { display: grid; grid-template-columns: 11mm 1fr; }
            .name-header { height: 7mm; background: #eaf2fb; border-bottom: 0.25mm solid #475569; font-size: 7.2pt; font-weight: 800; align-items: center; }
            .name-row { height: 6.6mm; border-bottom: 0.25mm solid #94a3b8; font-size: 7pt; color: #64748b; align-items: center; }
            .reverse-form .name-row { height: 6.7mm; }
            .name-row:last-child { border-bottom: 0; }
            .number-cell { height: 100%; display: flex; align-items: center; justify-content: center; border-right: 0.25mm solid #94a3b8; }
            .name-header .number-cell { border-right-color: #475569; }
            .name-title { padding-left: 2.5mm; }
            .continue-note { position: absolute; left: 5mm; right: 5mm; bottom: 4mm; text-align: center; color: #94a3b8; font-size: 6.5pt; }
            @media screen { body { background: #e8eef5; padding: 12px 0; } .sheet { margin: 0 auto 18px; background: white; box-shadow: 0 4px 18px rgba(0,0,0,0.16); } }
            @media print { body { background: white; padding: 0; } .sheet { margin: 0; box-shadow: none; } }
          </style>
        </head>
        <body>
          ${sheetsHtml}
          <script>
            window.addEventListener("load", function () {
              var images = Array.from(document.images);
              Promise.all(images.map(function (img) {
                if (img.complete) return Promise.resolve();
                return new Promise(function (resolve) {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
              })).then(function () {
                setTimeout(function () {
                  window.focus();
                  window.print();
                }, 350);
              });
            });
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportGenericPdf = () => {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const formWidth = pageWidth / 2;
    const formHeight = pageHeight / 2;
    const sheetCount = genericQuantity / MARKERS_PER_SHEET;

    const drawWriteInLine = (
      label: string,
      x: number,
      y: number,
      lineEnd: number
    ) => {
      pdf.setTextColor(51, 65, 85);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.text(label, x, y);
      const labelWidth = pdf.getTextWidth(label);
      pdf.setDrawColor(100, 116, 139);
      pdf.setLineWidth(0.25);
      pdf.line(x + labelWidth + 2, y + 0.5, lineEnd, y + 0.5);
    };

    const drawGenericForm = (
      slotIndex: number,
      side: "front" | "reverse"
    ) => {
      const column = slotIndex % 2;
      const row = Math.floor(slotIndex / 2);
      const x = column * formWidth;
      const y = row * formHeight;

      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.25);
      if (column === 0) {
        pdf.setLineDashPattern([1.5, 1.5], 0);
        pdf.line(formWidth, y, formWidth, y + formHeight);
      }
      if (row === 0) {
        pdf.setLineDashPattern([1.5, 1.5], 0);
        pdf.line(x, formHeight, x + formWidth, formHeight);
      }
      pdf.setLineDashPattern([], 0);

      const centreX = x + formWidth / 2;
      const left = x + 5.2;
      const right = x + formWidth - 5.2;
      const tableWidth = right - left;
      const numberWidth = 11;

      let tableTop: number;
      let firstNumber: number;
      let rowCount: number;
      let rowHeight: number;

      if (side === "front") {
        // Generic identification/write-in fields belong on the front only.
        pdf.addImage(SENIORS_EMBLEM, "JPEG", x + 4.5, y + 4.5, 12, 12);
        drawWriteInLine("EVENT / COMPETITION:", left + 15, y + 11, right);
        drawWriteInLine("MARKER:", left, y + 20, right);
        drawWriteInLine("HOLE:", left, y + 29, x + 45);
        tableTop = y + 38;
        firstNumber = 1;
        rowCount = FRONT_NAME_ROWS;
        rowHeight = 7.1;
      } else {
        pdf.setTextColor(185, 28, 28);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text(
          "THIS SIDE IS FOR CONTINUATION ONLY",
          centreX,
          y + 14,
          { align: "center", maxWidth: formWidth - 12 }
        );
        pdf.setTextColor(17, 24, 39);
        pdf.setFontSize(9);
        pdf.text(
          "PLEASE USE ONLY WHEN THE FRONT PAGE IS FULL",
          centreX,
          y + 22,
          { align: "center", maxWidth: formWidth - 12 }
        );
        tableTop = y + 28;
        firstNumber = 11;
        rowCount = 15;
        rowHeight = 6.7;
      }

      const headerHeight = 7;
      const tableHeight = headerHeight + rowCount * rowHeight;

      pdf.setDrawColor(71, 85, 105);
      pdf.setLineWidth(0.25);
      pdf.rect(left, tableTop, tableWidth, tableHeight);
      pdf.setFillColor(234, 242, 251);
      pdf.rect(left, tableTop, tableWidth, headerHeight, "F");
      pdf.line(
        left + numberWidth,
        tableTop,
        left + numberWidth,
        tableTop + tableHeight
      );
      pdf.line(
        left,
        tableTop + headerHeight,
        right,
        tableTop + headerHeight
      );

      pdf.setTextColor(51, 65, 85);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.2);
      pdf.text(
        "No.",
        left + numberWidth / 2,
        tableTop + 4.7,
        { align: "center" }
      );
      pdf.text(
        "NAME (PLEASE PRINT)",
        left + numberWidth + 2.5,
        tableTop + 4.7
      );

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      for (let index = 0; index < rowCount; index += 1) {
        const rowY =
          tableTop + headerHeight + index * rowHeight;
        if (index > 0) {
          pdf.setDrawColor(148, 163, 184);
          pdf.line(left, rowY, right, rowY);
        }
        pdf.text(
          String(firstNumber + index),
          left + numberWidth / 2,
          rowY + rowHeight * 0.67,
          { align: "center" }
        );
      }

      if (side === "front") {
        pdf.setTextColor(148, 163, 184);
        pdf.setFontSize(6.5);
        pdf.text(
          "Name list continues on reverse",
          centreX,
          y + formHeight - 4,
          { align: "center" }
        );
      }
    };

    for (let sheetIndex = 0; sheetIndex < sheetCount; sheetIndex += 1) {
      if (sheetIndex > 0) pdf.addPage();
      for (let slotIndex = 0; slotIndex < MARKERS_PER_SHEET; slotIndex += 1) {
        drawGenericForm(slotIndex, "front");
      }

      pdf.addPage();
      // Generic forms are identical, but the reverse page still uses the
      // proven duplex four-up geometry used by configured Course Markers.
      for (let slotIndex = 0; slotIndex < MARKERS_PER_SHEET; slotIndex += 1) {
        drawGenericForm(slotIndex, "reverse");
      }
    }

    pdf.save(`Generic-Course-Markers-${genericQuantity}-forms.pdf`);
  };

  const handlePrintGenericForms = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      window.alert(
        "Please allow pop-ups for Event Desk to print the Generic Course Marker forms."
      );
      return;
    }

    const buildNameTable = (firstNumber: number, rowCount: number) => {
      const rows = Array.from({ length: rowCount }, (_, index) =>
        `<div class="name-row"><div class="number-cell">${firstNumber + index}</div><div></div></div>`
      ).join("");

      return `
        <div class="name-table">
          <div class="name-header"><div class="number-cell">No.</div><div class="name-title">NAME (PLEASE PRINT)</div></div>
          ${rows}
        </div>
      `;
    };

    const buildGenericForm = (side: "front" | "reverse") =>
      side === "front"
        ? `
          <div class="marker-form">
            <img class="marker-emblem" src="${SENIORS_EMBLEM}" alt="Ramsdale Seniors emblem" />
            <div class="write-line event-line"><strong>EVENT / COMPETITION:</strong><span></span></div>
            <div class="write-line"><strong>MARKER:</strong><span></span></div>
            <div class="write-line hole-line"><strong>HOLE:</strong><span></span></div>
            ${buildNameTable(1, FRONT_NAME_ROWS)}
            <div class="continue-note">Name list continues on reverse</div>
          </div>
        `
        : `
          <div class="marker-form reverse-form">
            <div class="reverse-warning-primary">THIS SIDE IS FOR CONTINUATION ONLY</div>
            <div class="reverse-warning-secondary">PLEASE USE ONLY WHEN THE FRONT PAGE IS FULL</div>
            ${buildNameTable(11, 15)}
          </div>
        `;

    const sheetCount = genericQuantity / MARKERS_PER_SHEET;
    let sheetsHtml = "";

    for (let sheetIndex = 0; sheetIndex < sheetCount; sheetIndex += 1) {
      sheetsHtml += `<div class="sheet">${Array.from(
        { length: MARKERS_PER_SHEET },
        () => buildGenericForm("front")
      ).join("")}</div>`;
      sheetsHtml += `<div class="sheet">${Array.from(
        { length: MARKERS_PER_SHEET },
        () => buildGenericForm("reverse")
      ).join("")}</div>`;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Generic Course Markers</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: white; font-family: Arial, Helvetica, sans-serif; }
            .sheet {
              width: 210mm;
              height: 296mm;
              display: grid;
              grid-template-columns: 105mm 105mm;
              grid-template-rows: 148mm 148mm;
              page-break-after: always;
              break-after: page;
              overflow: hidden;
            }
            .sheet:last-child { page-break-after: auto; break-after: auto; }
            .marker-form {
              width: 105mm;
              height: 148mm;
              position: relative;
              overflow: hidden;
              padding: 4.5mm 5.2mm 4mm;
              border-right: 0.25mm dashed #94a3b8;
              border-bottom: 0.25mm dashed #94a3b8;
              color: #334155;
            }
            .marker-form:nth-child(2n) { border-right: 0; }
            .marker-form:nth-child(n+3) { border-bottom: 0; }
            .marker-emblem { position: absolute; left: 4.5mm; top: 4.5mm; width: 12mm; height: 12mm; object-fit: contain; }
            .write-line { height: 9mm; display: flex; align-items: flex-end; gap: 2mm; font-size: 7.5pt; color: #334155; }
            .write-line strong { white-space: nowrap; }
            .write-line span { flex: 1; border-bottom: 0.25mm solid #64748b; height: 4mm; }
            .event-line { padding-left: 15mm; }
            .hole-line span { flex: 0 0 28mm; }
            .name-table { margin-top: 2mm; border: 0.25mm solid #475569; }
            .name-header, .name-row { display: grid; grid-template-columns: 11mm 1fr; }
            .name-header { height: 7mm; background: #eaf2fb; border-bottom: 0.25mm solid #475569; font-size: 7.2pt; font-weight: 800; align-items: center; }
            .name-row { height: 7.1mm; border-bottom: 0.25mm solid #94a3b8; font-size: 7pt; color: #64748b; align-items: center; }
            .reverse-form .name-row { height: 6.7mm; }
            .name-row:last-child { border-bottom: 0; }
            .number-cell { height: 100%; display: flex; align-items: center; justify-content: center; border-right: 0.25mm solid #94a3b8; }
            .name-header .number-cell { border-right-color: #475569; }
            .name-title { padding-left: 2.5mm; }
            .reverse-warning-primary { text-align: center; margin-top: 2mm; color: #b91c1c; font-size: 11.5pt; font-weight: 900; line-height: 1.05; }
            .reverse-warning-secondary { text-align: center; margin-top: 2mm; color: #111827; font-size: 8.5pt; font-weight: 900; line-height: 1.1; }
            .continue-note { position: absolute; left: 5mm; right: 5mm; bottom: 4mm; text-align: center; color: #94a3b8; font-size: 6.5pt; }
            @media screen { body { background: #e8eef5; padding: 12px 0; } .sheet { margin: 0 auto 18px; background: white; box-shadow: 0 4px 18px rgba(0,0,0,0.16); } }
            @media print { body { background: white; padding: 0; } .sheet { margin: 0; box-shadow: none; } }
          </style>
        </head>
        <body>
          ${sheetsHtml}
          <script>
            window.addEventListener("load", function () {
              var images = Array.from(document.images);
              Promise.all(images.map(function (img) {
                if (img.complete) return Promise.resolve();
                return new Promise(function (resolve) {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
              })).then(function () {
                setTimeout(function () {
                  window.focus();
                  window.print();
                }, 350);
              });
            });
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const openPreview = () => {
    if (markers.length === 0) {
      window.alert(
        "Add at least one Course Marker before previewing the forms."
      );
      return;
    }

    setPreviewPage(0);
    setPreviewSide("front");
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewPage(0);
    setPreviewSide("front");
  };

  /*
   * PREVIEW SCREEN
   */
  if (showPreview) {
    return (
      <div className="workspace">
        <div
          style={{
            maxWidth: "1050px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "20px",
              marginBottom: "22px",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "34px",
                  color: "#2f2f2f",
                }}
              >
                Course Marker Preview
              </h1>

              <div
                style={{
                  marginTop: "7px",
                  color: "#64748b",
                  fontSize: "16px",
                }}
              >
                A4 portrait • four forms
                per sheet
              </div>
            </div>

            <button
              type="button"
              onClick={closePreview}
              style={{
                border:
                  "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "11px 18px",
                background: "white",
                color: "#334155",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ← Back to Course Markers
            </button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "18px",
              marginBottom: "20px",
            }}
          >
            <button
              type="button"
              disabled={previewPage === 0}
              onClick={() =>
                setPreviewPage(
                  (page) => page - 1
                )
              }
              style={{
                padding: "9px 15px",
                borderRadius: "8px",
                border:
                  "1px solid #cbd5e1",
                background:
                  previewPage === 0
                    ? "#e5e7eb"
                    : "white",
                cursor:
                  previewPage === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              ← Previous
            </button>

            <strong
              style={{
                color: "#475569",
              }}
            >
              Sheet {previewPage + 1} of{" "}
              {totalPreviewPages}
            </strong>

            <button
              type="button"
              disabled={
                previewPage >=
                totalPreviewPages - 1
              }
              onClick={() =>
                setPreviewPage(
                  (page) => page + 1
                )
              }
              style={{
                padding: "9px 15px",
                borderRadius: "8px",
                border:
                  "1px solid #cbd5e1",
                background:
                  previewPage >=
                  totalPreviewPages - 1
                    ? "#e5e7eb"
                    : "white",
                cursor:
                  previewPage >=
                  totalPreviewPages - 1
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Next →
            </button>
          </div>

          {/* FRONT / REVERSE SELECTOR */}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              marginBottom: "18px",
            }}
          >
            <button
              type="button"
              onClick={() => setPreviewSide("front")}
              style={{
                padding: "9px 22px",
                borderRadius: "8px",
                border: "1px solid #205b9f",
                background:
                  previewSide === "front"
                    ? "#205b9f"
                    : "white",
                color:
                  previewSide === "front"
                    ? "white"
                    : "#205b9f",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Front
            </button>

            <button
              type="button"
              onClick={() => setPreviewSide("reverse")}
              style={{
                padding: "9px 22px",
                borderRadius: "8px",
                border: "1px solid #205b9f",
                background:
                  previewSide === "reverse"
                    ? "#205b9f"
                    : "white",
                color:
                  previewSide === "reverse"
                    ? "white"
                    : "#205b9f",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reverse
            </button>
          </div>

          {/* A4 SHEET */}

          <div
            style={{
              width: "720px",
              height: "1018px",
              margin: "0 auto 30px",
              background: "white",
              border:
                "1px solid #94a3b8",
              boxShadow:
                "0 8px 30px rgba(0,0,0,0.16)",
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gridTemplateRows:
                "1fr 1fr",
            }}
          >
            {previewSlots.map(
              (marker, slotIndex) => {
                const isLeft =
                  slotIndex % 2 === 0;

                const isTop =
                  slotIndex < 2;

                return (
                  <div
                    key={slotIndex}
                    style={{
                      position:
                        "relative",
                      padding:
                        "18px 18px 14px",
                      overflow: "hidden",

                      borderRight:
                        isLeft
                          ? "1px dashed #94a3b8"
                          : "none",

                      borderBottom:
                        isTop
                          ? "1px dashed #94a3b8"
                          : "none",
                    }}
                  >
                    {marker && (
                      <>
                        {previewSide === "front" ? (
                          <>
                        <img
                          src={SENIORS_EMBLEM}
                          alt="Ramsdale Seniors emblem"
                          style={{
                            position: "absolute",
                            top: "10px",
                            left: "10px",
                            width: "42px",
                            height: "42px",
                            objectFit: "contain",
                          }}
                        />
                        {/* EVENT NAME */}

                        <div
                          style={{
                            textAlign:
                              "center",
                            fontSize:
                              "15px",
                            fontWeight:
                              700,
                            color:
                              "#334155",
                            lineHeight:
                              1.2,
                            minHeight:
                              "34px",
                          }}
                        >
                          {event.eventName ||
                            "Untitled Event"}
                        </div>

                        {/* EVENT DATE */}

                        <div
                          style={{
                            textAlign:
                              "center",
                            marginTop:
                              "2px",
                            fontSize:
                              "11px",
                            color:
                              "#64748b",
                          }}
                        >
                          {formatEventDate(
                            event.eventDate
                          )}
                        </div>

                        {/* MARKER TYPE */}

                        <div
                          style={{
                            textAlign:
                              "center",
                            marginTop:
                              "9px",
                            fontSize:
                              "21px",
                            lineHeight:
                              1.05,
                            fontWeight:
                              800,
                            color:
                              "#205b9f",
                            textTransform:
                              "uppercase",
                          }}
                        >
                          {marker.type}
                        </div>

                        {/* HOLE */}

                        <div
                          style={{
                            textAlign:
                              "center",
                            marginTop:
                              "5px",
                            fontSize:
                              "18px",
                            fontWeight:
                              800,
                            color:
                              "#111827",
                          }}
                        >
                          HOLE{" "}
                          {marker.hole}
                        </div>

                        {/* ELIGIBILITY */}

                        <div
                          style={{
                            textAlign:
                              "center",
                            marginTop:
                              "4px",
                          }}
                        >
                          <span
                            style={{
                              display:
                                "inline-block",
                              padding:
                                "3px 11px",
                              borderRadius:
                                "14px",
                              background:
                                marker.eligibility ===
                                "Open"
                                  ? "#eef6ff"
                                  : "#f1f5f9",
                              border:
                                "1px solid #cbd5e1",
                              color:
                                "#334155",
                              fontSize:
                                "10px",
                              fontWeight:
                                800,
                              textTransform:
                                "uppercase",
                            }}
                          >
                            {
                              marker.eligibility
                            }
                          </span>
                        </div>

                        {/* NAME TABLE */}

                        <div
                          style={{
                            marginTop:
                              "10px",
                            border:
                              "1px solid #475569",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "grid",
                              gridTemplateColumns:
                                "38px 1fr",
                              background:
                                "#eaf2fb",
                              borderBottom:
                                "1px solid #475569",
                              fontSize:
                                "11px",
                              fontWeight:
                                800,
                              color:
                                "#334155",
                            }}
                          >
                            <div
                              style={{
                                padding:
                                  "4px",
                                textAlign:
                                  "center",
                                borderRight:
                                  "1px solid #475569",
                              }}
                            >
                              No.
                            </div>

                            <div
                              style={{
                                padding:
                                  "4px 8px",
                              }}
                            >
                              NAME
                              (PLEASE PRINT)
                            </div>
                          </div>

                          {Array.from({
                            length:
                              FRONT_NAME_ROWS,
                          }).map(
                            (_, rowIndex) => (
                              <div
                                key={
                                  rowIndex
                                }
                                style={{
                                  display:
                                    "grid",
                                  gridTemplateColumns:
                                    "38px 1fr",
                                  minHeight:
                                    "22px",
                                  borderBottom:
                                    rowIndex ===
                                    FRONT_NAME_ROWS -
                                      1
                                      ? "none"
                                      : "1px solid #94a3b8",
                                }}
                              >
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    justifyContent:
                                      "center",
                                    borderRight:
                                      "1px solid #94a3b8",
                                    fontSize:
                                      "10px",
                                    color:
                                      "#64748b",
                                  }}
                                >
                                  {rowIndex +
                                    1}
                                </div>

                                <div />
                              </div>
                            )
                          )}
                        </div>

                        <div
                          style={{
                            position:
                              "absolute",
                            left: "18px",
                            right:
                              "18px",
                            bottom:
                              "7px",
                            textAlign:
                              "center",
                            fontSize:
                              "9px",
                            color:
                              "#94a3b8",
                          }}
                        >
                          Name list continues
                          on reverse
                        </div>

                          </>
                        ) : (
                          <>
                        {/* REVERSE CONTINUATION WARNING */}

                        <div
                          style={{
                            textAlign: "center",
                            marginTop: "4px",
                            fontSize: "17px",
                            fontWeight: 900,
                            color: "#b91c1c",
                            lineHeight: 1.05,
                          }}
                        >
                          THIS SIDE IS FOR CONTINUATION ONLY
                        </div>

                        <div
                          style={{
                            textAlign: "center",
                            marginTop: "8px",
                            fontSize: "12px",
                            fontWeight: 900,
                            color: "#111827",
                            lineHeight: 1.1,
                          }}
                        >
                          PLEASE USE ONLY WHEN THE FRONT PAGE IS FULL
                        </div>

                        {/* REVERSE NAME TABLE */}

                        <div
                          style={{
                            marginTop: "12px",
                            border: "1px solid #475569",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "38px 1fr",
                              background: "#eaf2fb",
                              borderBottom: "1px solid #475569",
                              fontSize: "11px",
                              fontWeight: 800,
                              color: "#334155",
                            }}
                          >
                            <div
                              style={{
                                padding: "4px",
                                textAlign: "center",
                                borderRight: "1px solid #475569",
                              }}
                            >
                              No.
                            </div>

                            <div
                              style={{
                                padding: "4px 8px",
                              }}
                            >
                              NAME (PLEASE PRINT)
                            </div>
                          </div>

                          {Array.from({ length: 15 }).map(
                            (_, rowIndex) => (
                              <div
                                key={rowIndex}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "38px 1fr",
                                  minHeight: "22px",
                                  borderBottom:
                                    rowIndex === 14
                                      ? "none"
                                      : "1px solid #94a3b8",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRight: "1px solid #94a3b8",
                                    fontSize: "10px",
                                    color: "#64748b",
                                  }}
                                >
                                  {rowIndex + 11}
                                </div>

                                <div />
                              </div>
                            )
                          )}
                        </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    );
  }

  /*
   * CONFIGURATION SCREEN
   */
  return (
    <div className="workspace">
      <div className="page-header">
        <h1>Course Markers</h1>

        <p>
          Configure Nearest the Pin,
          Longest Drive and Nearest the Line
          marker forms for this event.
        </p>
      </div>

      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* EVENT INFORMATION */}

        <div
          style={{
            background: "#eef6ff",
            border:
              "1px solid #d6e7f7",
            borderRadius: "14px",
            padding: "22px 26px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "120px 1fr",
              rowGap: "12px",
              alignItems: "center",
            }}
          >
            <strong
              style={{
                color: "#205b9f",
                fontSize: "16px",
              }}
            >
              Event:
            </strong>

            <span
              style={{
                fontSize: "18px",
                fontWeight: 600,
              }}
            >
              {event.eventName ||
                "Untitled Event"}
            </span>

            <strong
              style={{
                color: "#205b9f",
                fontSize: "16px",
              }}
            >
              Date:
            </strong>

            <span
              style={{
                fontSize: "18px",
                fontWeight: 600,
              }}
            >
              {formatEventDate(
                event.eventDate
              )}
            </span>
          </div>
        </div>

        {/* MARKER TABLE */}

        <div
          style={{
            background: "white",
            border:
              "1px solid #d8e2ec",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow:
              "0 3px 10px rgba(31,91,159,0.06)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "2fr 0.7fr 1.4fr 90px",
              background: "#205b9f",
              color: "white",
              fontWeight: 700,
              fontSize: "15px",
            }}
          >
            <div style={{ padding: "15px 18px" }}>
              Marker Type
            </div>

            <div style={{ padding: "15px 18px" }}>
              Hole
            </div>

            <div style={{ padding: "15px 18px" }}>
              Eligibility
            </div>

            <div
              style={{
                padding: "15px 10px",
                textAlign: "center",
              }}
            >
              Action
            </div>
          </div>

          {markers.length === 0 && (
            <div
              style={{
                padding: "38px 24px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "16px",
              }}
            >
              No Course Markers have been
              added to this event.
            </div>
          )}

          {markers.map(
            (marker, index) => (
              <div
                key={marker.id}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "2fr 0.7fr 1.4fr 90px",
                  alignItems: "center",
                  borderTop:
                    index === 0
                      ? "none"
                      : "1px solid #e2e8f0",
                  padding:
                    "10px 12px",
                  gap: "10px",
                }}
              >
                <select
                  value={marker.type}
                  onChange={(e) =>
                    handleTypeChange(
                      marker.id,
                      e.target
                        .value as MarkerType
                    )
                  }
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 12px",
                    border:
                      "1px solid #cfd7df",
                    borderRadius: "8px",
                    background: "white",
                    fontSize: "15px",
                  }}
                >
                  <option value="Nearest the Pin">
                    Nearest the Pin
                  </option>

                  <option value="Longest Drive">
                    Longest Drive
                  </option>

                  <option value="Nearest the Line">
                    Nearest the Line
                  </option>
                </select>

                <select
                  value={marker.hole}
                  onChange={(e) =>
                    handleHoleChange(
                      marker.id,
                      Number(
                        e.target.value
                      )
                    )
                  }
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 12px",
                    border:
                      "1px solid #cfd7df",
                    borderRadius: "8px",
                    background: "white",
                    fontSize: "15px",
                  }}
                >
                  {holeOptions.map(
                    (hole) => (
                      <option
                        key={hole}
                        value={hole}
                      >
                        {hole}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={
                    marker.eligibility
                  }
                  onChange={(e) =>
                    handleEligibilityChange(
                      marker.id,
                      e.target
                        .value as Eligibility
                    )
                  }
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 12px",
                    border:
                      "1px solid #cfd7df",
                    borderRadius: "8px",
                    background: "white",
                    fontSize: "15px",
                  }}
                >
                  <option value="Open">
                    Open
                  </option>

                  <option value="Men Only">
                    Men Only
                  </option>

                  <option value="Ladies Only">
                    Ladies Only
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteMarker(
                      marker.id
                    )
                  }
                  title="Delete this Course Marker"
                  aria-label="Delete Course Marker"
                  style={{
                    width: "48px",
                    height: "42px",
                    justifySelf: "center",
                    border: "none",
                    borderRadius: "8px",
                    background: "#dc2626",
                    color: "white",
                    fontSize: "18px",
                    cursor: "pointer",
                  }}
                >
                  🗑
                </button>
              </div>
            )
          )}
        </div>

        {/* ADD MARKER */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginTop: "22px",
            gap: "20px",
          }}
        >
          <button
            type="button"
            onClick={handleAddMarker}
            disabled={
              markers.length >=
              MAX_MARKERS
            }
            style={{
              border:
                "1px solid #8acb9a",
              borderRadius: "10px",
              padding: "13px 20px",
              background:
                markers.length >=
                MAX_MARKERS
                  ? "#e5e7eb"
                  : "#eaf8ed",
              color:
                markers.length >=
                MAX_MARKERS
                  ? "#94a3b8"
                  : "#18723a",
              fontSize: "16px",
              fontWeight: 700,
              cursor:
                markers.length >=
                MAX_MARKERS
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            ＋ Add Course Marker
          </button>

          <div
            style={{
              color: "#64748b",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {markers.length} /{" "}
            {MAX_MARKERS} markers
          </div>
        </div>

        {/* OUTPUT ACTIONS */}

        <div
          style={{
            marginTop: "28px",
            padding: "22px",
            border:
              "1px solid #d6e7f7",
            borderRadius: "14px",
            background: "#f8fbff",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#205b9f",
              marginBottom: "16px",
            }}
          >
            Course Marker Forms
          </div>

          <div
            style={{
              display: "flex",
              gap: "14px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={openPreview}
              disabled={
                markers.length === 0
              }
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "13px 22px",
                background:
                  markers.length === 0
                    ? "#cbd5e1"
                    : "#4d9fe8",
                color: "white",
                fontSize: "16px",
                fontWeight: 700,
                cursor:
                  markers.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              👁 Preview Forms
            </button>

            <button
              type="button"
              onClick={exportPdf}
              disabled={markers.length === 0}
              title="Export duplex-ready Course Marker PDF"
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "13px 22px",
                background:
                  markers.length === 0
                    ? "#cbd5e1"
                    : "#205b9f",
                color: "white",
                fontSize: "16px",
                fontWeight: 700,
                cursor:
                  markers.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              📄 Export PDF
            </button>

            <button
              type="button"
              onClick={handlePrintForms}
              disabled={markers.length === 0}
              title="Print duplex-ready Course Marker forms"
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "13px 22px",
                background:
                  markers.length === 0
                    ? "#cbd5e1"
                    : "#18723a",
                color: "white",
                fontSize: "16px",
                fontWeight: 700,
                cursor:
                  markers.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              🖨 Print Forms
            </button>
          </div>

          <div
            style={{
              marginTop: "14px",
              color: "#64748b",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            Forms are arranged four per A4
            portrait sheet. PDF export and direct
            printing use the same approved duplex-ready
            front/reverse layout.
          </div>

          <div
            style={{
              marginTop: "22px",
              paddingTop: "20px",
              borderTop: "1px solid #d6e7f7",
            }}
          >
            <div
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "#205b9f",
                marginBottom: "8px",
              }}
            >
              📝 Generic Marker Forms
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: "14px",
                lineHeight: 1.5,
                marginBottom: "14px",
              }}
            >
              Blank write-in forms for ad-hoc events.
              Event / Competition, Marker and Hole are
              completed by hand.
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label
                htmlFor="generic-marker-quantity"
                style={{
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Quantity
              </label>

              <select
                id="generic-marker-quantity"
                value={genericQuantity}
                onChange={(e) =>
                  setGenericQuantity(
                    Number(e.target.value) as 4 | 8 | 12 | 16
                  )
                }
                style={{
                  height: "44px",
                  padding: "0 12px",
                  border: "1px solid #cfd7df",
                  borderRadius: "8px",
                  background: "white",
                  fontSize: "15px",
                }}
              >
                <option value={4}>4 forms</option>
                <option value={8}>8 forms</option>
                <option value={12}>12 forms</option>
                <option value={16}>16 forms</option>
              </select>

              <button
                type="button"
                onClick={exportGenericPdf}
                style={{
                  border: "none",
                  borderRadius: "10px",
                  padding: "13px 22px",
                  background: "#205b9f",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📄 Export Generic PDF
              </button>

              <button
                type="button"
                onClick={handlePrintGenericForms}
                style={{
                  border: "none",
                  borderRadius: "10px",
                  padding: "13px 22px",
                  background: "#2f7d4a",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🖨 Print Generic Forms
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}