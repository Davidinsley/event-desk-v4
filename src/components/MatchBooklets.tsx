// MatchBooklets.tsx
// Ramsdale Seniors Event Desk
// Revision: Match Booklet with 2x2 overview and clean no-preview editors

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface MatchBookletsProps {
  onBack: () => void;
}

type MatchBookletView = "overview" | "seasonCover" | "startSheet" | "orderDay" | "matchInfo";

const SEASON_COVER_KEY = "eventDeskMatchBookletsSeasonCover";
const ORDER_DAY_KEY = "eventDeskMatchBookletsOrderDay";
const MATCH_INFO_KEY = "eventDeskMatchBookletsMatchInfo";

const DEFAULT_ORDER_DAY = [
  { label: "Arrival / Coffee", time: "" },
  { label: "Captain's Welcome", time: "" },
  { label: "First Tee Time", time: "" },
  { label: "Post-match Meal", time: "" },
  { label: "Results / Closing", time: "" },
];

const DEFAULT_MATCH_INFO = {
  food: "",
  prizes: "",
  course: "",
  notes: "",
};

function MatchBooklets({ onBack }: MatchBookletsProps) {
  const [view, setView] = useState<MatchBookletView>("overview");
  const [seasonCover, setSeasonCover] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startSheetInputRef = useRef<HTMLInputElement | null>(null);
  const [startSheetPreview, setStartSheetPreview] = useState<string | null>(null);
  const [orderDayRows, setOrderDayRows] = useState(DEFAULT_ORDER_DAY);
  const [orderDayNotes, setOrderDayNotes] = useState("");
  const [matchInfo, setMatchInfo] = useState(DEFAULT_MATCH_INFO);

  useEffect(() => {
    try {
      const savedCover = localStorage.getItem(SEASON_COVER_KEY);
      if (savedCover) {
        setSeasonCover(savedCover);
      }

      const savedOrderDay = localStorage.getItem(ORDER_DAY_KEY);
      if (savedOrderDay) {
        const parsed = JSON.parse(savedOrderDay);
        if (Array.isArray(parsed?.rows)) {
          setOrderDayRows(parsed.rows);
        }
        if (typeof parsed?.notes === "string") {
          setOrderDayNotes(parsed.notes);
        }
      }

      const savedMatchInfo = localStorage.getItem(MATCH_INFO_KEY);
      if (savedMatchInfo) {
        const parsed = JSON.parse(savedMatchInfo);
        setMatchInfo({
          food: typeof parsed?.food === "string" ? parsed.food : "",
          prizes: typeof parsed?.prizes === "string" ? parsed.prizes : "",
          course: typeof parsed?.course === "string" ? parsed.course : "",
          notes: typeof parsed?.notes === "string" ? parsed.notes : "",
        });
      }
    } catch (error) {
      console.error("Failed to load Match Booklets data", error);
    }
  }, []);

  const handleSeasonCoverFile = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      let coverDataUrl: string;

      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Could not create PDF preview canvas.");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        coverDataUrl = canvas.toDataURL("image/png");
      } else if (file.type.startsWith("image/")) {
        coverDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            if (typeof reader.result === "string") {
              resolve(reader.result);
            } else {
              reject(new Error("Could not read image file."));
            }
          };

          reader.onerror = () => {
            reject(new Error("Could not read image file."));
          };

          reader.readAsDataURL(file);
        });
      } else {
        window.alert("Please choose a PDF or image file for the season cover.");
        event.target.value = "";
        return;
      }

      localStorage.setItem(SEASON_COVER_KEY, coverDataUrl);
      setSeasonCover(coverDataUrl);
    } catch (error) {
      console.error("Failed to save Match Booklets season cover", error);
      window.alert(
        "The season cover could not be loaded or stored. Please try again."
      );
    } finally {
      event.target.value = "";
    }
  };

  const recolorStartSheetHighlights = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];

      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const spread = max - min;

      // Only adjust coloured highlight fills. Dark text, black grid lines,
      // white cells and the red WHS note remain untouched.
      if (max < 145 || spread < 28) {
        continue;
      }

      const isOrange =
        red > green + 18 &&
        green > blue + 5;

      const isBlue =
        blue > red + 12 &&
        blue > green + 6;

      const isGreen =
        green > red + 10 &&
        green > blue + 5;

      let target: [number, number, number] | null = null;

      if (isOrange) {
        // Light sage: maintains a distinct "attention" highlight.
        target = [202, 226, 194];
      } else if (isBlue) {
        // Mid green: clearly different from the lighter highlight.
        target = [166, 207, 160];
      } else if (isGreen) {
        // Stronger green: retains the original third-level emphasis.
        target = [116, 181, 124];
      }

      if (!target) {
        continue;
      }

      // Preserve some of the original luminance so shading and anti-aliasing
      // remain natural rather than looking like flat blocks.
      const luminance = (red + green + blue) / 3;
      const factor = Math.max(0.72, Math.min(1.12, luminance / 210));

      data[index] = Math.min(255, Math.round(target[0] * factor));
      data[index + 1] = Math.min(255, Math.round(target[1] * factor));
      data[index + 2] = Math.min(255, Math.round(target[2] * factor));
    }

    context.putImageData(imageData, 0, 0);
  };

  const handleStartSheetFile = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      window.alert("Please choose the PDF start sheet supplied for this match.");
      event.target.value = "";
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not create start-sheet preview canvas.");
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({
        canvas,
        canvasContext: context,
        viewport,
      }).promise;

      recolorStartSheetHighlights(canvas);
      setStartSheetPreview(canvas.toDataURL("image/png"));
    } catch (error) {
      console.error("Failed to load Match Booklets start sheet", error);
      window.alert("The match start-sheet PDF could not be loaded.");
    } finally {
      event.target.value = "";
    }
  };

  const saveOrderDay = (rows = orderDayRows, notes = orderDayNotes) => {
    try {
      localStorage.setItem(ORDER_DAY_KEY, JSON.stringify({ rows, notes }));
    } catch (error) {
      console.error("Failed to save Match Booklets Order of the Day", error);
    }
  };

  const updateOrderDayRow = (
    index: number,
    field: "label" | "time",
    value: string
  ) => {
    const nextRows = orderDayRows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [field]: value } : row
    );
    setOrderDayRows(nextRows);
    saveOrderDay(nextRows, orderDayNotes);
  };

  const updateOrderDayNotes = (value: string) => {
    setOrderDayNotes(value);
    saveOrderDay(orderDayRows, value);
  };

  const restoreStandardOrderDay = () => {
    const confirmed = window.confirm(
      "Restore the standard Order of the Day layout?\n\nThis will clear the current times and notes."
    );

    if (!confirmed) {
      return;
    }

    const rows = DEFAULT_ORDER_DAY.map((row) => ({ ...row }));
    setOrderDayRows(rows);
    setOrderDayNotes("");
    saveOrderDay(rows, "");
  };

  const updateMatchInfo = (
    field: keyof typeof DEFAULT_MATCH_INFO,
    value: string
  ) => {
    const next = { ...matchInfo, [field]: value };
    setMatchInfo(next);

    try {
      localStorage.setItem(MATCH_INFO_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Failed to save Match Booklets Match Day Information", error);
    }
  };

  const clearMatchInfo = () => {
    const confirmed = window.confirm(
      "Clear all Match Day Information for Page 4?"
    );

    if (!confirmed) {
      return;
    }

    setMatchInfo(DEFAULT_MATCH_INFO);

    try {
      localStorage.removeItem(MATCH_INFO_KEY);
    } catch (error) {
      console.error("Failed to clear Match Booklets Match Day Information", error);
    }
  };

  const handleRemoveSeasonCover = () => {
    const confirmed = window.confirm(
      "Remove the current season cover master?\n\nThis will leave Page 1 blank until another season cover is selected."
    );

    if (!confirmed) {
      return;
    }

    try {
      localStorage.removeItem(SEASON_COVER_KEY);
    } catch (error) {
      console.error("Failed to remove Match Booklets season cover", error);
    }

    setSeasonCover(null);
  };


  const escapePrintHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const printText = (value: string) =>
    escapePrintHtml(value || "—").replace(/\n/g, "<br />");

  const buildPrintPage1 = () => `
    <section class="booklet-page cover-page">
      ${
        seasonCover
          ? `<img class="cover-image" src="${seasonCover}" alt="Season cover" />`
          : `<div class="missing-page">Season Cover not selected</div>`
      }
    </section>
  `;

  const buildPrintPage2 = () => `
    <section class="booklet-page green-page page-two">
      <div class="start-sheet-area">
        ${
          startSheetPreview
            ? `<img class="start-sheet-image" src="${startSheetPreview}" alt="Match start sheet" />`
            : `<div class="missing-page compact">Match Start Sheet not selected</div>`
        }
      </div>

      <div class="result-record">
        <div class="result-title">MATCH RESULT RECORD</div>
        <table>
          <tbody>
            <tr>
              <th>Match</th>
              ${[1, 2, 3, 4, 5, 6, 7, 8]
                .map((group) => `<th>${group}</th>`)
                .join("")}
            </tr>
            <tr>
              <th>Score</th>
              ${[1, 2, 3, 4, 5, 6, 7, 8]
                .map(() => "<td>&nbsp;</td>")
                .join("")}
            </tr>
            <tr>
              <th>Won By</th>
              ${[1, 2, 3, 4, 5, 6, 7, 8]
                .map(() => "<td>R / V / H</td>")
                .join("")}
            </tr>
          </tbody>
        </table>
        <div class="final-score">
          Final Match Score: Ramsdale ______ &nbsp;&nbsp;&nbsp; Visitors ______
        </div>
        <div class="result-key">
          R = Ramsdale &nbsp;&nbsp;&nbsp; V = Visitors &nbsp;&nbsp;&nbsp; H = Halved
        </div>
      </div>
    </section>
  `;

  const buildPrintPage3 = () => `
    <section class="booklet-page green-page content-page">
      <h1>ORDER OF THE DAY</h1>
      <div class="green-rule"></div>

      <div class="order-list">
        ${orderDayRows
          .map(
            (row) => `
              <div class="order-row">
                <div class="order-time">${printText(row.time)}</div>
                <div class="order-label">${printText(row.label)}</div>
              </div>
            `
          )
          .join("")}
      </div>

      <div class="notes-panel">
        <strong>Additional Match-day Notes</strong>
        <div>${printText(orderDayNotes)}</div>
      </div>
    </section>
  `;

  const buildPrintPage4 = () => `
    <section class="booklet-page green-page content-page page-four">
      <h1>MATCH DAY INFORMATION</h1>
      <div class="green-rule"></div>

      <div class="info-section">
        <strong>Food / Menu</strong>
        <div>${printText(matchInfo.food)}</div>
      </div>

      <div class="info-section">
        <strong>Prizes</strong>
        <div>${printText(matchInfo.prizes)}</div>
      </div>

      <div class="info-section">
        <strong>Course / Local Information</strong>
        <div>${printText(matchInfo.course)}</div>
      </div>

      <div class="notes-panel large-notes">
        <strong>Additional Notes</strong>
        <div>${printText(matchInfo.notes)}</div>
      </div>
    </section>
  `;


  const buildDigitalFlipBookHtml = () => {
    const pages = [
      buildPrintPage1(),
      buildPrintPage2(),
      buildPrintPage3(),
      buildPrintPage4(),
    ];

    const serializedPages = JSON.stringify(pages).replace(/</g, "\\u003c");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Ramsdale Seniors Digital Match Booklet</title>
          <style>
            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              width: 100%;
              min-height: 100%;
              font-family: Arial, Helvetica, sans-serif;
              background:
                radial-gradient(circle at top, #f7faf5 0%, #eef4ec 42%, #e6eee4 100%);
              color: #1f2937;
            }

            body {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
            }

            .flip-header {
              flex: 0 0 auto;
              padding: 18px 24px 12px;
              text-align: center;
            }

            .flip-header h1 {
              margin: 0;
              color: #3f6544;
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
              width: min(86vw, 520px);
              aspect-ratio: 148.5 / 210;
              perspective: 1800px;
              position: relative;
            }

            .book-page-wrap {
              width: 100%;
              height: 100%;
              position: absolute;
              inset: 0;
              transform-style: preserve-3d;
              transition:
                transform 420ms ease,
                opacity 260ms ease;
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
                0 18px 50px rgba(31, 65, 38, 0.18),
                0 2px 8px rgba(0, 0, 0, 0.12);
              position: relative;
            }

            .book-page::after {
              content: "";
              position: absolute;
              inset: 0;
              pointer-events: none;
              box-shadow: inset -10px 0 22px rgba(79,111,82,0.05);
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

            .nav-button {
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              width: 46px;
              height: 46px;
              border-radius: 50%;
              border: 1px solid #9fb79b;
              background: rgba(255,255,255,0.94);
              color: #4f6f52;
              font-size: 24px;
              font-weight: 800;
              cursor: pointer;
              box-shadow: 0 4px 14px rgba(31,65,38,0.12);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 5;
            }

            .nav-button:hover {
              background: #f4f8f2;
            }

            .nav-button:disabled {
              opacity: 0.3;
              cursor: default;
            }

            .nav-prev {
              left: 12px;
            }

            .nav-next {
              right: 12px;
            }

            .flip-footer {
              flex: 0 0 auto;
              padding: 0 18px 22px;
              text-align: center;
            }

            .page-label {
              color: #4f6f52;
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
              border: 1px solid #6f8e68;
              background: white;
              padding: 0;
              cursor: pointer;
            }

            .dot.active {
              background: #6f8e68;
            }

            .booklet-page {
              width: 105mm;
              height: 148mm;
              overflow: hidden;
              position: relative;
              background: white;
            }

            .cover-page {
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .cover-image {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
            }

            .green-page {
              border: 0.55mm double #8faa86;
              padding: 5.5mm;
            }

            .content-page h1 {
              margin: 0;
              text-align: center;
              color: #4f6f52;
              font-size: 14pt;
              line-height: 1.1;
              font-weight: 800;
            }

            .green-rule {
              height: 0.45mm;
              background: #dce8d8;
              margin: 2.5mm 0 5mm;
            }

            .order-list {
              display: grid;
              gap: 2.5mm;
            }

            .order-row {
              display: grid;
              grid-template-columns: 20mm 1fr;
              gap: 3mm;
              align-items: center;
              border-bottom: 0.25mm solid #e5eee2;
              padding-bottom: 2mm;
            }

            .order-time {
              color: #4f6f52;
              font-weight: 800;
              font-size: 10pt;
            }

            .order-label {
              font-weight: 700;
              font-size: 11pt;
              line-height: 1.25;
            }

            .info-section {
              margin-bottom: 4mm;
              padding-bottom: 3mm;
              border-bottom: 0.25mm solid #e5eee2;
              font-size: 11pt;
              line-height: 1.35;
              font-weight: 700;
            }

            .info-section strong,
            .notes-panel strong {
              display: block;
              color: #4f6f52;
              font-size: 11pt;
              font-weight: 800;
              margin-bottom: 1.2mm;
            }

            .notes-panel {
              margin-top: auto;
              padding: 3.5mm;
              min-height: 27mm;
              background: #f4f8f2;
              border: 0.3mm solid #dce8d8;
              font-size: 10.5pt;
              line-height: 1.35;
              font-weight: 700;
            }

            .content-page {
              display: flex;
              flex-direction: column;
            }

            .large-notes {
              min-height: 57mm;
            }

            .page-two {
              display: flex;
              flex-direction: column;
              padding: 3.5mm;
            }

            .start-sheet-area {
              flex: 1 1 auto;
              min-height: 0;
              overflow: hidden;
              display: flex;
              align-items: flex-start;
              justify-content: center;
            }

            .start-sheet-image {
              width: 110%;
              height: auto;
              max-width: none;
              display: block;
              flex: 0 0 auto;
              margin-left: -5%;
              margin-right: -5%;
            }

            .result-record {
              flex: 0 0 24mm;
              color: #4f6f52;
              font-size: 5.5pt;
              padding-top: 1.2mm;
            }

            .result-title {
              text-align: center;
              font-weight: 800;
              font-size: 6.6pt;
              margin-bottom: 0.8mm;
            }

            .result-record table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 5pt;
              line-height: 1;
            }

            .result-record th,
            .result-record td {
              border: 0.25mm solid #9fb79b;
              height: 4mm;
              text-align: center;
              padding: 0.4mm;
            }

            .result-record th {
              background: #f1f6ee;
              font-weight: 700;
            }

            .final-score {
              border: 0.25mm solid #9fb79b;
              background: #f1f6ee;
              text-align: center;
              font-weight: 700;
              padding: 0.8mm;
              margin-top: 0.7mm;
            }

            .result-key {
              text-align: center;
              font-size: 4.5pt;
              padding-top: 0.5mm;
            }

            .missing-page {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              color: #64748b;
              border: 0.4mm dashed #c7d9ed;
              padding: 8mm;
              font-weight: 700;
            }

            @media (max-width: 640px) {
              .flip-stage {
                padding-left: 48px;
                padding-right: 48px;
              }

              .nav-button {
                width: 38px;
                height: 38px;
                font-size: 20px;
              }

              .nav-prev {
                left: 6px;
              }

              .nav-next {
                right: 6px;
              }
            }
          </style>
        </head>

        <body>
          <header class="flip-header">
            <h1>Ramsdale Seniors Match Booklet</h1>
            <p>Digital edition</p>
          </header>

          <main class="flip-stage">
            <button id="prev" class="nav-button nav-prev" aria-label="Previous page">
              ‹
            </button>

            <div class="book-shell">
              <div id="pageWrap" class="book-page-wrap">
                <div id="bookPage" class="book-page"></div>
              </div>
            </div>

            <button id="next" class="nav-button nav-next" aria-label="Next page">
              ›
            </button>
          </main>

          <footer class="flip-footer">
            <div id="pageLabel" class="page-label"></div>
            <div id="dots" class="dots"></div>
          </footer>

          <script>
            var pages = ${serializedPages};
            var titles = [
              "Front Cover",
              "Match Start Sheet",
              "Order of the Day",
              "Match Day Information"
            ];
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

              requestAnimationFrame(function () {
                fitPage();
              });
            }

            function showPage(index) {
              if (index === currentPage || index < 0 || index >= pages.length) {
                return;
              }

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

    link.href = url;
    link.download = "Ramsdale-Seniors-Match-Booklet.html";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };


  const handleExportPdf = () => {
    const page1 = buildPrintPage1();
    const page2 = buildPrintPage2();
    const page3 = buildPrintPage3();
    const page4 = buildPrintPage4();

    const pdfWindow = window.open("", "_blank", "width=900,height=900");

    if (!pdfWindow) {
      window.alert(
        "Event Desk could not open the PDF export window. Please allow pop-ups and try again."
      );
      return;
    }

    pdfWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ramsdale Seniors Match Booklet PDF</title>
          <style>
            @page {
              size: A5 portrait;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: white;
              font-family: Arial, Helvetica, sans-serif;
              color: #1f2937;
            }

            .pdf-page {
              width: 148mm;
              height: 210mm;
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              break-after: page;
              page-break-after: always;
              background: white;
            }

            .pdf-page:last-child {
              break-after: auto;
              page-break-after: auto;
            }

            .pdf-page .booklet-page {
              width: 148mm;
              height: 210mm;
              transform: none !important;
            }

            .booklet-page {
              overflow: hidden;
              position: relative;
              background: white;
            }

            .cover-page {
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .cover-image {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
            }

            .green-page {
              border: 0.75mm double #8faa86;
              padding: 7.5mm;
            }

            .content-page {
              display: flex;
              flex-direction: column;
            }

            .content-page h1 {
              margin: 0;
              text-align: center;
              color: #4f6f52;
              font-size: 20pt;
              line-height: 1.1;
              font-weight: 800;
            }

            .green-rule {
              height: 0.55mm;
              background: #dce8d8;
              margin: 3.5mm 0 7mm;
            }

            .order-list {
              display: grid;
              gap: 3.5mm;
            }

            .order-row {
              display: grid;
              grid-template-columns: 28mm 1fr;
              gap: 4mm;
              align-items: center;
              border-bottom: 0.3mm solid #e5eee2;
              padding-bottom: 3mm;
            }

            .order-time {
              color: #4f6f52;
              font-weight: 800;
              font-size: 14pt;
            }

            .order-label {
              font-weight: 700;
              font-size: 15.5pt;
              line-height: 1.25;
            }

            .info-section {
              margin-bottom: 6mm;
              padding-bottom: 4mm;
              border-bottom: 0.3mm solid #e5eee2;
              font-size: 15.5pt;
              line-height: 1.35;
              font-weight: 700;
            }

            .info-section strong,
            .notes-panel strong {
              display: block;
              color: #4f6f52;
              font-size: 15.5pt;
              font-weight: 800;
              margin-bottom: 1.8mm;
            }

            .notes-panel {
              margin-top: auto;
              padding: 5mm;
              min-height: 38mm;
              background: #f4f8f2;
              border: 0.35mm solid #dce8d8;
              font-size: 14.5pt;
              line-height: 1.35;
              font-weight: 700;
            }

            .large-notes {
              min-height: 80mm;
            }

            .page-two {
              display: flex;
              flex-direction: column;
              padding: 5mm;
            }

            .start-sheet-area {
              flex: 1 1 auto;
              min-height: 0;
              overflow: hidden;
              display: flex;
              align-items: flex-start;
              justify-content: center;
            }

            .start-sheet-image {
              width: 110%;
              height: auto;
              max-width: none;
              display: block;
              flex: 0 0 auto;
              margin-left: -5%;
              margin-right: -5%;
            }

            .result-record {
              flex: 0 0 34mm;
              color: #4f6f52;
              font-size: 7.5pt;
              padding-top: 1.6mm;
            }

            .result-title {
              text-align: center;
              font-weight: 800;
              font-size: 9pt;
              margin-bottom: 1mm;
            }

            .result-record table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 7pt;
              line-height: 1;
            }

            .result-record th,
            .result-record td {
              border: 0.3mm solid #9fb79b;
              height: 5.5mm;
              text-align: center;
              padding: 0.5mm;
            }

            .result-record th {
              background: #f1f6ee;
              font-weight: 700;
            }

            .final-score {
              border: 0.3mm solid #9fb79b;
              background: #f1f6ee;
              text-align: center;
              font-weight: 700;
              padding: 1mm;
              margin-top: 1mm;
            }

            .result-key {
              text-align: center;
              font-size: 6pt;
              padding-top: 0.7mm;
            }

            .missing-page {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              color: #64748b;
              border: 0.5mm dashed #c7d9ed;
              padding: 10mm;
              font-weight: 700;
            }

            @media screen {
              body {
                background: #e8eee7;
                padding: 18px 0;
              }

              .pdf-page {
                margin: 0 auto 22px;
                box-shadow: 0 4px 18px rgba(0, 0, 0, 0.16);
              }
            }

            @media print {
              body {
                background: white;
                padding: 0;
              }

              .pdf-page {
                margin: 0;
                box-shadow: none;
              }
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

  const handlePrintBooklets = () => {
    const page1 = buildPrintPage1();
    const page2 = buildPrintPage2();
    const page3 = buildPrintPage3();
    const page4 = buildPrintPage4();

    const printWindow = window.open("", "_blank", "width=1100,height=900");

    if (!printWindow) {
      window.alert(
        "Event Desk could not open the booklet print window. Please allow pop-ups and try again."
      );
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ramsdale Seniors Match Booklets</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: white;
              font-family: Arial, Helvetica, sans-serif;
              color: #1f2937;
            }

            .print-sheet {
              width: 210mm;
              height: 296mm;
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              break-after: page;
              page-break-after: always;
              background: white;
            }

            .print-sheet:last-child {
              break-after: auto;
              page-break-after: auto;
            }

            .booklet-copy {
              width: 210mm;
              height: 148mm;
              display: flex;
              flex: 0 0 148mm;
              overflow: hidden;
            }

            .booklet-page {
              width: 105mm;
              height: 148mm;
              flex: 0 0 105mm;
              overflow: hidden;
              position: relative;
              background: white;
            }

            .cover-page {
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .cover-image {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
            }

            .green-page {
              border: 0.55mm double #8faa86;
              padding: 5.5mm;
            }

            .content-page h1 {
              margin: 0;
              text-align: center;
              color: #4f6f52;
              font-size: 14pt;
              line-height: 1.1;
              font-weight: 800;
            }

            .green-rule {
              height: 0.45mm;
              background: #dce8d8;
              margin: 2.5mm 0 5mm;
            }

            .order-list {
              display: grid;
              gap: 2.5mm;
            }

            .order-row {
              display: grid;
              grid-template-columns: 20mm 1fr;
              gap: 3mm;
              align-items: center;
              border-bottom: 0.25mm solid #e5eee2;
              padding-bottom: 2mm;
            }

            .order-time {
              color: #4f6f52;
              font-weight: 800;
              font-size: 10pt;
            }

            .order-label {
              font-weight: 700;
              font-size: 11pt;
              line-height: 1.25;
            }

            .info-section {
              margin-bottom: 4mm;
              padding-bottom: 3mm;
              border-bottom: 0.25mm solid #e5eee2;
              font-size: 11pt;
              line-height: 1.35;
              font-weight: 700;
            }

            .info-section strong,
            .notes-panel strong {
              display: block;
              color: #4f6f52;
              font-size: 11pt;
              font-weight: 800;
              margin-bottom: 1.2mm;
            }

            .notes-panel {
              margin-top: auto;
              padding: 3.5mm;
              min-height: 27mm;
              background: #f4f8f2;
              border: 0.3mm solid #dce8d8;
              font-size: 10.5pt;
              line-height: 1.35;
              font-weight: 700;
            }

            .content-page {
              display: flex;
              flex-direction: column;
            }

            .large-notes {
              min-height: 57mm;
            }

            .page-two {
              display: flex;
              flex-direction: column;
              padding: 3.5mm;
            }

            .start-sheet-area {
              flex: 1 1 auto;
              min-height: 0;
              overflow: hidden;
              display: flex;
              align-items: flex-start;
              justify-content: center;
            }

            .start-sheet-image {
              width: 110%;
              height: auto;
              max-width: none;
              display: block;
              flex: 0 0 auto;
              margin-left: -5%;
              margin-right: -5%;
            }

            .result-record {
              flex: 0 0 24mm;
              color: #4f6f52;
              font-size: 5.5pt;
              padding-top: 1.2mm;
            }

            .result-title {
              text-align: center;
              font-weight: 800;
              font-size: 6.6pt;
              margin-bottom: 0.8mm;
            }

            .result-record table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 5pt;
              line-height: 1;
            }

            .result-record th,
            .result-record td {
              border: 0.25mm solid #9fb79b;
              height: 4mm;
              text-align: center;
              padding: 0.4mm;
            }

            .result-record th {
              background: #f1f6ee;
              font-weight: 700;
            }

            .final-score {
              border: 0.25mm solid #9fb79b;
              background: #f1f6ee;
              text-align: center;
              font-weight: 700;
              padding: 0.8mm;
              margin-top: 0.7mm;
            }

            .result-key {
              text-align: center;
              font-size: 4.5pt;
              padding-top: 0.5mm;
            }

            .missing-page {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              color: #64748b;
              border: 0.4mm dashed #c7d9ed;
              padding: 8mm;
              font-weight: 700;
            }

            .missing-page.compact {
              height: auto;
              min-height: 45mm;
            }

            @media screen {
              body {
                background: #dfe7ef;
                padding: 20px 0;
              }

              .print-sheet {
                margin: 0 auto 24px;
                box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);
              }
            }

            @media print {
              body {
                background: white;
                padding: 0;
              }

              .print-sheet {
                margin: 0;
                box-shadow: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="print-sheet">
            <div class="booklet-copy">
              ${page4}
              ${page1}
            </div>
            <div class="booklet-copy">
              ${page4}
              ${page1}
            </div>
          </div>

          <div class="print-sheet">
            <div class="booklet-copy">
              ${page2}
              ${page3}
            </div>
            <div class="booklet-copy">
              ${page2}
              ${page3}
            </div>
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

            window.addEventListener("afterprint", function () {
              setTimeout(function () {
                window.close();
              }, 150);
            });
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (view === "matchInfo") {
    return (
      <section
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "24px 42px 28px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            marginBottom: "18px",
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: "#205b9f", fontSize: "38px" }}>
              Match Day Information
            </h1>
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "18px" }}>
              Flexible match-specific information for Page 4.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setView("overview")}
            style={{
              border: "1px solid #2f6db5",
              borderRadius: "10px",
              padding: "12px 18px",
              background: "white",
              color: "#205b9f",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Match Booklets
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: "18px" }}>
            <div
              style={{
                background: "white",
                border: "1px solid #dbe7f3",
                borderRadius: "14px",
                padding: "22px",
                boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 14px",
                  color: "#1e4f89",
                  fontSize: "19px",
                }}
              >
                Page 4 Content
              </h2>

              {[
                ["food", "Food / Menu"],
                ["prizes", "Prizes"],
                ["course", "Course / Local Information"],
              ].map(([field, label]) => (
                <div key={field} style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      color: "#4f6f52",
                      fontWeight: 700,
                      fontSize: "14px",
                    }}
                  >
                    {label}
                  </label>
                  <textarea
                    value={matchInfo[field as keyof typeof matchInfo]}
                    onChange={(event) =>
                      updateMatchInfo(
                        field as keyof typeof DEFAULT_MATCH_INFO,
                        event.target.value
                      )
                    }
                    rows={3}
                    style={{
                      width: "100%",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "10px",
                      boxSizing: "border-box",
                      resize: "vertical",
                      font: "inherit",
                    }}
                  />
                </div>
              ))}

              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  color: "#4f6f52",
                  fontWeight: 700,
                  fontSize: "14px",
                }}
              >
                Additional Notes
              </label>
              <textarea
                value={matchInfo.notes}
                onChange={(event) =>
                  updateMatchInfo("notes", event.target.value)
                }
                rows={12}
                style={{
                  width: "100%",
                  minHeight: "245px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "10px",
                  boxSizing: "border-box",
                  resize: "vertical",
                  font: "inherit",
                }}
              />
            </div>

            <button
              type="button"
              onClick={clearMatchInfo}
              style={{
                width: "100%",
                border: "1px solid #9fb79b",
                borderRadius: "10px",
                padding: "12px 16px",
                background: "#f4f8f2",
                color: "#4f6f52",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Clear Page 4
            </button>

            <div
              style={{
                background: "#f8fbff",
                border: "1px solid #dbe7f3",
                borderRadius: "14px",
                padding: "22px",
                color: "#526174",
                lineHeight: 1.55,
              }}
            >
              <strong style={{ color: "#205b9f" }}>Page 4:</strong> designed to
              change from match to match and hold whatever information is useful
              for that particular fixture.
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (view === "orderDay") {
    return (
      <section
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "36px 42px 48px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: "#205b9f", fontSize: "38px" }}>
              Order of the Day
            </h1>
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "18px" }}>
              Standard match-day template — edit only when arrangements differ.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setView("overview")}
            style={{
              border: "1px solid #2f6db5",
              borderRadius: "10px",
              padding: "12px 18px",
              background: "white",
              color: "#205b9f",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Match Booklets
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: "18px" }}>
            <div
              style={{
                background: "white",
                border: "1px solid #dbe7f3",
                borderRadius: "14px",
                padding: "22px",
                boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
              }}
            >
              <h2 style={{ margin: "0 0 14px", color: "#1e4f89", fontSize: "21px" }}>
                Match-day Order
              </h2>

              <div style={{ display: "grid", gap: "10px" }}>
                {orderDayRows.map((row, index) => (
                  <div
                    key={`edit-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "105px minmax(0, 1fr)",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="text"
                      value={row.time}
                      onChange={(event) =>
                        updateOrderDayRow(index, "time", event.target.value)
                      }
                      placeholder="Time"
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        padding: "9px 10px",
                        font: "inherit",
                      }}
                    />
                    <input
                      type="text"
                      value={row.label}
                      onChange={(event) =>
                        updateOrderDayRow(index, "label", event.target.value)
                      }
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        padding: "9px 10px",
                        font: "inherit",
                      }}
                    />
                  </div>
                ))}
              </div>

              <textarea
                value={orderDayNotes}
                onChange={(event) => updateOrderDayNotes(event.target.value)}
                placeholder="Additional match-day notes"
                rows={4}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "10px",
                  boxSizing: "border-box",
                  resize: "vertical",
                  font: "inherit",
                }}
              />
            </div>

            <button
              type="button"
              onClick={restoreStandardOrderDay}
              style={{
                width: "100%",
                border: "1px solid #9fb79b",
                borderRadius: "10px",
                padding: "12px 16px",
                background: "#f4f8f2",
                color: "#4f6f52",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Restore Standard Layout
            </button>

            <div
              style={{
                background: "#f8fbff",
                border: "1px solid #dbe7f3",
                borderRadius: "14px",
                padding: "22px",
                color: "#526174",
                lineHeight: 1.55,
              }}
            >
              <strong style={{ color: "#205b9f" }}>Page 3:</strong> normally kept as the standard order, but the times, wording and notes can be changed for an individual match when required.
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (view === "startSheet") {
    return (
      <section
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "36px 42px 48px",
          boxSizing: "border-box",
        }}
      >
        <input
          ref={startSheetInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleStartSheetFile}
          style={{ display: "none" }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: "#205b9f", fontSize: "38px" }}>
              Match Start Sheet
            </h1>
            <p
              style={{
                margin: "8px 0 0",
                color: "#64748b",
                fontSize: "18px",
              }}
            >
              Import the supplied PDF for this home match.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setView("overview")}
            style={{
              border: "1px solid #2f6db5",
              borderRadius: "10px",
              padding: "12px 18px",
              background: "white",
              color: "#205b9f",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Match Booklets
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.45fr) minmax(300px, 0.55fr)",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid #dbe7f3",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                padding: "12px 0",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "min(100%, 520px)",
                  aspectRatio: "148.5 / 210",
                  background: "white",
                  border: startSheetPreview
                    ? "3px double #8fb58b"
                    : "2px dashed #c7d9ed",
                  boxShadow: startSheetPreview
                    ? "inset 0 0 0 3px #eef5eb, 0 3px 12px rgba(79,111,82,0.12)"
                    : "0 3px 12px rgba(31,91,159,0.10)",
                  overflow: "hidden",
                  boxSizing: "border-box",
                }}
              >
                {startSheetPreview ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: "3%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "96%",
                        height: "96%",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: "84px",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src={startSheetPreview}
                          alt="Imported match start sheet for A5 booklet page"
                          style={{
                            width: "115%",
                            height: "auto",
                            maxWidth: "none",
                            maxHeight: "none",
                            objectFit: "contain",
                            display: "block",
                            alignSelf: "flex-start",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: "78px",
                          color: "#4f6f52",
                          fontFamily: "Arial, Helvetica, sans-serif",
                          background: "white",
                        }}
                      >
                        <div
                          style={{
                            textAlign: "center",
                            fontWeight: 800,
                            fontSize: "9px",
                            marginBottom: "2px",
                          }}
                        >
                          MATCH RESULT RECORD
                        </div>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            tableLayout: "fixed",
                            fontSize: "8px",
                            lineHeight: 1,
                          }}
                        >
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  border: "1px solid #9fb79b",
                                  padding: "2px 3px",
                                  width: "13%",
                                  fontWeight: 700,
                                  textAlign: "center",
                                  background: "#f1f6ee",
                                }}
                              >
                                Match
                              </td>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((group) => (
                                <td
                                  key={`match-${group}`}
                                  style={{
                                    border: "1px solid #9fb79b",
                                    padding: "2px 1px",
                                    textAlign: "center",
                                    fontWeight: 700,
                                  }}
                                >
                                  {group}
                                </td>
                              ))}
                            </tr>
                            <tr>
                              <td
                                style={{
                                  border: "1px solid #9fb79b",
                                  padding: "2px 3px",
                                  fontWeight: 700,
                                  textAlign: "center",
                                  background: "#f1f6ee",
                                }}
                              >
                                Score
                              </td>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((group) => (
                                <td
                                  key={`score-${group}`}
                                  style={{
                                    border: "1px solid #9fb79b",
                                    height: "12px",
                                  }}
                                />
                              ))}
                            </tr>
                            <tr>
                              <td
                                style={{
                                  border: "1px solid #9fb79b",
                                  padding: "2px 3px",
                                  fontWeight: 700,
                                  textAlign: "center",
                                  background: "#f1f6ee",
                                }}
                              >
                                Won By
                              </td>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((group) => (
                                <td
                                  key={`winner-${group}`}
                                  style={{
                                    border: "1px solid #9fb79b",
                                    padding: "2px 1px",
                                    textAlign: "center",
                                    fontSize: "7px",
                                  }}
                                >
                                  R / V / H
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                        <div
                          style={{
                            marginTop: "2px",
                            border: "1px solid #9fb79b",
                            padding: "2px 5px",
                            textAlign: "center",
                            fontSize: "8px",
                            fontWeight: 700,
                            background: "#f1f6ee",
                            color: "#4f6f52",
                          }}
                        >
                          Final Match Score: Ramsdale ______ &nbsp;&nbsp; Visitors ______
                        </div>
                        <div
                          style={{
                            marginTop: "1px",
                            textAlign: "center",
                            fontSize: "6.5px",
                            color: "#4f6f52",
                          }}
                        >
                          R = Ramsdale &nbsp;&nbsp;&nbsp; V = Visitors &nbsp;&nbsp;&nbsp; H = Halved
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: "7%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    <div style={{ fontSize: "54px", marginBottom: "14px" }}>
                      📄
                    </div>
                    <h2
                      style={{
                        margin: "0 0 10px",
                        color: "#1e4f89",
                        fontSize: "24px",
                      }}
                    >
                      A5 Page 2 Preview
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "17px",
                        lineHeight: 1.55,
                      }}
                    >
                      The wide match start sheet will be rotated 90° and enlarged
                      to use the maximum printable space on this A5 portrait page.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: "18px" }}>
            <div
              style={{
                background: "white",
                border: "1px solid #dbe7f3",
                borderRadius: "14px",
                padding: "22px",
                boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 10px",
                  color: "#1e4f89",
                  fontSize: "19px",
                }}
              >
                This Match
              </h2>
              <p
                style={{
                  margin: "0 0 18px",
                  color: "#64748b",
                  lineHeight: 1.55,
                }}
              >
                Page 2 changes for every home match. The supplied PDF is kept
                intact rather than rebuilding or retyping the player data.
              </p>

              <button
                type="button"
                onClick={() => startSheetInputRef.current?.click()}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "10px",
                  padding: "13px 16px",
                  background: "#2468b3",
                  color: "white",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {startSheetPreview
                  ? "Replace Start Sheet PDF"
                  : "Choose Start Sheet PDF"}
              </button>
            </div>

            <div
              style={{
                background: "#f8fbff",
                border: "1px solid #dbe7f3",
                borderRadius: "14px",
                padding: "22px",
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: "#205b9f",
                  marginBottom: "8px",
                }}
              >
                Orientation
              </strong>
              <span style={{ color: "#526174", lineHeight: 1.55 }}>
                The imported start sheet is displayed in its normal orientation and enlarged to use the maximum available space above the fixed result table.
              </span>
            </div>

            <div
              style={{
                background: "white",
                border: "1px solid #dbe7f3",
                borderRadius: "14px",
                padding: "22px",
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: "#205b9f",
                  marginBottom: "8px",
                }}
              >
                Print foundation
              </strong>
              <span style={{ color: "#526174", lineHeight: 1.55 }}>
                Page 2 will ultimately be imposed with Page 3 on Side 2 of the
                two-booklets-per-A4 print layout.
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (view === "seasonCover") {
    return (
      <section
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "36px 42px 48px",
          boxSizing: "border-box",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleSeasonCoverFile}
          style={{ display: "none" }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                color: "#205b9f",
                fontSize: "38px",
              }}
            >
              Season Cover
            </h1>
            <p
              style={{
                margin: "8px 0 0",
                color: "#64748b",
                fontSize: "18px",
              }}
            >
              Annual master cover for the Ramsdale Seniors match season.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setView("overview")}
            style={{
              border: "1px solid #2f6db5",
              borderRadius: "10px",
              padding: "12px 18px",
              background: "white",
              color: "#205b9f",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Match Booklets
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, 0.65fr)",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid #dbe7f3",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "460px",
                margin: "0 auto",
                aspectRatio: "148.5 / 210",
                border: seasonCover
                  ? "1px solid #cfdceb"
                  : "2px dashed #c7d9ed",
                borderRadius: "12px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                background: "#fbfdff",
                boxSizing: "border-box",
              }}
            >
              {seasonCover ? (
                <img
                  src={seasonCover}
                  alt="Ramsdale Seniors season cover"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    background: "white",
                  }}
                />
              ) : (
                <div
                  style={{
                    padding: "30px",
                    color: "#64748b",
                  }}
                >
                  <div
                    style={{
                      fontSize: "54px",
                      marginBottom: "14px",
                    }}
                  >
                    🖼️
                  </div>
                  <h2
                    style={{
                      margin: "0 0 10px",
                      color: "#1e4f89",
                      fontSize: "24px",
                    }}
                  >
                    Season Cover Preview
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "17px",
                      lineHeight: 1.55,
                    }}
                  >
                    Choose the approved Ramsdale Seniors annual cover as a PDF or image. Once
                    saved, it remains the master used for the season.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: "16px",
            }}
          >
            <div
              style={{
                background: "white",
                border: "1px solid #dbe7f3",
                borderRadius: "14px",
                padding: "22px",
                boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 10px",
                  color: "#1e4f89",
                  fontSize: "19px",
                }}
              >
                Annual Master
              </h2>
              <p
                style={{
                  margin: "0 0 18px",
                  color: "#64748b",
                  lineHeight: 1.55,
                }}
              >
                Normally changed only once each season to update the year and,
                where necessary, the set of opposing-club emblems.
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "10px",
                  padding: "13px 16px",
                  background: "#2468b3",
                  color: "white",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {seasonCover
                  ? "Replace Season Cover"
                  : "Choose Season Cover"}
              </button>

              {seasonCover && (
                <button
                  type="button"
                  onClick={handleRemoveSeasonCover}
                  style={{
                    width: "100%",
                    marginTop: "10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    background: "white",
                    color: "#475569",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Remove Season Cover
                </button>
              )}
            </div>

            <div
              style={{
                background: "#f8fbff",
                border: "1px solid #dbe7f3",
                borderRadius: "14px",
                padding: "22px",
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: "#205b9f",
                  marginBottom: "8px",
                }}
              >
                Stored for the season
              </strong>
              <span
                style={{
                  color: "#526174",
                  lineHeight: 1.55,
                }}
              >
                The selected cover is stored by Event Desk and should still be
                present after closing and reopening the app.
              </span>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #dbe7f3",
                borderRadius: "14px",
                padding: "22px",
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: "#205b9f",
                  marginBottom: "8px",
                }}
              >
                Print foundation
              </strong>
              <span
                style={{
                  color: "#526174",
                  lineHeight: 1.55,
                }}
              >
                Page 1 is maintained at A5 portrait proportions and will be
                imposed with Page 4 on Side 1 of the two-booklets-per-A4 print
                layout.
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "36px 42px 48px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: "#205b9f",
              fontSize: "38px",
            }}
          >
            Match Booklets
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: "18px",
            }}
          >
            Create a professional booklet for each Ramsdale Seniors home match.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          style={{
            border: "1px solid #2f6db5",
            borderRadius: "10px",
            padding: "12px 18px",
            background: "white",
            color: "#205b9f",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← Main Menu
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "18px",
        }}
      >
        <button
          type="button"
          onClick={() => setView("seasonCover")}
          style={{
            background: "white",
            border: "1px solid #dbe7f3",
            borderRadius: "14px",
            padding: "16px 18px",
            minHeight: "150px",
            boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
            textAlign: "left",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#eef6ff",
              color: "#205b9f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "16px",
              marginBottom: "10px",
            }}
          >
            1
          </div>
          <h2
            style={{
              margin: "0 0 8px",
              color: "#1e4f89",
              fontSize: "19px",
            }}
          >
            Season Cover
          </h2>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              lineHeight: 1.4,
            }}
          >
            Annual master — normally updated once per season for the year and
            opponent emblems.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setView("startSheet")}
          style={{
            background: "white",
            border: "1px solid #dbe7f3",
            borderRadius: "14px",
            padding: "16px 18px",
            minHeight: "150px",
            boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
            textAlign: "left",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#eef6ff",
              color: "#205b9f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "16px",
              marginBottom: "10px",
            }}
          >
            2
          </div>
          <h2
            style={{
              margin: "0 0 8px",
              color: "#1e4f89",
              fontSize: "21px",
            }}
          >
            Match Start Sheet
          </h2>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              lineHeight: 1.4,
            }}
          >
            Import the start-sheet PDF for each home match and place it at
            maximum readable size.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setView("orderDay")}
          style={{
            background: "white",
            border: "1px solid #dbe7f3",
            borderRadius: "14px",
            padding: "16px 18px",
            minHeight: "150px",
            boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
            textAlign: "left",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#eef6ff",
              color: "#205b9f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "16px",
              marginBottom: "10px",
            }}
          >
            3
          </div>
          <h2 style={{ margin: "0 0 8px", color: "#1e4f89", fontSize: "21px" }}>
            Order of the Day
          </h2>
          <p style={{ margin: 0, color: "#64748b", lineHeight: 1.5 }}>
            Standard template — edit when match timings, food arrangements or the general order differ.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setView("matchInfo")}
          style={{
            background: "white",
            border: "1px solid #dbe7f3",
            borderRadius: "14px",
            padding: "16px 18px",
            minHeight: "150px",
            boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
            textAlign: "left",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#eef6ff",
              color: "#205b9f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "16px",
              marginBottom: "10px",
            }}
          >
            4
          </div>
          <h2 style={{ margin: "0 0 8px", color: "#1e4f89", fontSize: "21px" }}>
            Match Day Information
          </h2>
          <p style={{ margin: 0, color: "#64748b", lineHeight: 1.5 }}>
            Flexible page for match-specific notes, menu details, dress information,
            prizes or other instructions.
          </p>
        </button>
      </div>

      <div
        style={{
          marginTop: "24px",
          display: "flex",
          justifyContent: "center",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={handleOpenDigitalFlipBook}
          style={{
            border: "1px solid #7f9e78",
            borderRadius: "12px",
            padding: "14px 26px",
            background: "#f4f8f2",
            color: "#4f6f52",
            fontSize: "16px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(79,111,82,0.10)",
          }}
        >
          📖 Open Digital Flip Book
        </button>

        <button
          type="button"
          onClick={handleExportDigitalFlipBook}
          style={{
            border: "1px solid #7f9e78",
            borderRadius: "12px",
            padding: "14px 26px",
            background: "white",
            color: "#4f6f52",
            fontSize: "16px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(79,111,82,0.10)",
          }}
        >
          ⬇️ Export Digital Flip Book
        </button>

        <button
          type="button"
          onClick={handleExportPdf}
          style={{
            border: "1px solid #7f9e78",
            borderRadius: "12px",
            padding: "14px 26px",
            background: "white",
            color: "#4f6f52",
            fontSize: "16px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(79,111,82,0.10)",
          }}
        >
          📄 Export PDF
        </button>

        <button
          type="button"
          onClick={handlePrintBooklets}
          style={{
            border: "none",
            borderRadius: "12px",
            padding: "14px 26px",
            background: "#4f6f52",
            color: "white",
            fontSize: "16px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(79,111,82,0.18)",
          }}
        >
          🖨️ Print 2 Match Booklets / A4
        </button>
      </div>

      <div
        style={{
          marginTop: "24px",
          padding: "20px 22px",
          background: "#f8fbff",
          border: "1px solid #dbe7f3",
          borderRadius: "14px",
          color: "#526174",
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: "#205b9f" }}>Print format:</strong> two
        identical four-page booklets per A4 sheet, double-sided. Side 1 repeats
        Page 4 + Page 1 in the top and bottom halves; Side 2 repeats Page 2 +
        Page 3 in the top and bottom halves.
      </div>
    </section>
  );
}

export default MatchBooklets;
