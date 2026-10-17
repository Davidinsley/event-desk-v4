// Revision: Event Media PDF thumbnail rendering for attached posters
// Revision: Core Event Details report reads live Catering V4 data
// NewEvent.tsx

// Social Fairways Society Event Desk

// Revision: Add Meeting-Ready Event Preview

import { useEffect, useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { jsPDF } from "jspdf";

import "./NewEvent.css";

import type {

  Event,

  EventStatus,

} from "../types/Event";

import type { Player } from "../types/Player";
import { getPosterLibrary, type PosterItem } from "../posterStorage";
import PageLayout from "../layout/PageLayout";

import SummaryCard from "../ui/SummaryCard";

import ActionTile from "../ui/ActionTile";

import {

  Save,

  FolderOpen,

  ClipboardList,

  Eye,
  Mail,

} from "lucide-react";

interface NewEventProps {

  event: Event;

  setEvent: React.Dispatch<React.SetStateAction<Event>>;

  onPriorityChange: (priority: boolean) => void;

  players: Player[];

  attachedPosterIds: string[];

  onAttachPoster: () => void;

  onDeleteEvent: () => void;

  canDelete: boolean;

  published: boolean;

  archived: boolean;

  onOpenChecklist?: () => void;

  onOpenPlanningAid?: () => void;

}


const DEFAULT_VENUE = "Ramsdale Park Golf Club";

// Catering V4 stores the live event catering data separately from the core event record.
const CATERING_KEY_PREFIX = "eventDeskCateringV1:";
const EVENT_RECORDS_KEY = "eventDeskEventRecords";
const ACTIVE_EVENT_ID_KEY = "eventDeskActiveEventId";
const CHECKLIST_STORAGE_PREFIX = "eventDeskChecklistV1:";

const VENUE_STORAGE_KEY = "eventDeskVenues";

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

function EventMediaThumbnail({
  poster,
  single,
}: {
  poster: PosterItem;
  single: boolean;
}) {
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
          throw new Error("Unable to create Event Media PDF preview canvas.");
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
          console.error("Failed to render attached PDF poster", error);
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

  const imageStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    maxHeight: single ? "420px" : "300px",
    objectFit: "contain",
    borderRadius: "6px",
    background: "#f5f7fa",
  };

  if (!isPdf) {
    return (
      <img
        src={poster.image}
        alt={poster.title}
        style={imageStyle}
      />
    );
  }

  if (pdfPreview) {
    return (
      <img
        src={pdfPreview}
        alt={`${poster.title} PDF preview`}
        style={imageStyle}
      />
    );
  }

  return (
    <div
      style={{
        ...imageStyle,
        minHeight: single ? "220px" : "170px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "12px",
        boxSizing: "border-box",
        color: pdfFailed ? "#a33" : "#666",
      }}
    >
      {pdfFailed ? "PDF preview unavailable" : "Rendering PDF…"}
    </div>
  );
}

const getStoredVenues = (): string[] => {

  try {

    const stored = localStorage.getItem(

      VENUE_STORAGE_KEY

    );

    if (!stored) {

      return [DEFAULT_VENUE];

    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {

      return [DEFAULT_VENUE];

    }

    const venues = parsed.filter(

      (venue): venue is string =>

        typeof venue === "string" &&

        venue.trim().length > 0

    );

    if (!venues.includes(DEFAULT_VENUE)) {

      venues.unshift(DEFAULT_VENUE);

    }

    return venues;

  } catch {

    return [DEFAULT_VENUE];

  }

};

const getStatusLabel = (

  status: EventStatus

): string => {

  switch (status) {

    case "confirmed":

      return "Confirmed";

    case "published":

      return "Published";

    case "archived":

      return "Archived";

    case "draft":

    default:

      return "Draft";

  }

};

const getStatusVariant = (

  status: EventStatus

): "default" | "success" | "warning" | "danger" | "muted" => {

  switch (status) {

    case "confirmed":

      return "success";

    case "published":

      return "default";

    case "archived":

      return "muted";

    case "draft":

    default:

      return "warning";

  }

};

const getWeekday = (

  dateValue: string

): string | null => {

  const match = dateValue.match(

    /^(\d{2})\/(\d{2})\/(\d{4})$/

  );

  if (!match) {

    return null;

  }

  const day = Number(match[1]);

  const month = Number(match[2]);

  const year = Number(match[3]);

  const date = new Date(

    year,

    month - 1,

    day

  );

  if (

    date.getFullYear() !== year ||

    date.getMonth() !== month - 1 ||

    date.getDate() !== day

  ) {

    return null;

  }

  return date.toLocaleDateString("en-GB", {

    weekday: "long",

  });

};

/*

 * Escape values before placing them into the

 * standalone preview document.

 */

const escapeHtml = (

  value: string

): string =>

  value

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

/*

 * Format multiline competition rules for

 * the printable document.

 */

const formatRules = (

  value: string

): string =>

  escapeHtml(value)

    .replace(/\r\n/g, "\n")

    .replace(/\r/g, "\n")

    .replace(/\n/g, "<br />");

export default function NewEvent({

  event,

  setEvent,

  onPriorityChange,

  players,

  attachedPosterIds = [],

  onAttachPoster,

  published,

  archived,

  onOpenChecklist,

  onOpenPlanningAid,

}: NewEventProps) {

  const [venues, setVenues] =

    useState<string[]>(

      getStoredVenues

    );

  const [

    showSaveConfirmation,

    setShowSaveConfirmation,

  ] = useState(false);

  const [

    showPosterWarning,

    setShowPosterWarning,

  ] = useState(false);

  const [showAddVenue, setShowAddVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [showWebsiteNotification, setShowWebsiteNotification] = useState(false);
  const [showWebsitePublicationDetails, setShowWebsitePublicationDetails] = useState(false);


  const currentStatus: EventStatus =

    archived
      ? "archived"
      : published
      ? "published"
      : "draft";

  const weekday = useMemo(

    () => getWeekday(event.eventDate),

    [event.eventDate]

  );

  const attachedPosterId =
    attachedPosterIds[0] ?? null;

  const [posterLibrary, setPosterLibrary] =
    useState<PosterItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadPosters = async () => {
      try {
        const stored = await getPosterLibrary();

        if (!cancelled) {
          setPosterLibrary(stored);
        }
      } catch (error) {
        console.error(
          "Failed to load poster library for Event Details",
          error
        );
      }
    };

    void loadPosters();

    return () => {
      cancelled = true;
    };
  }, []);

  const attachedPosters = useMemo(
    () =>
      attachedPosterIds
        .map((posterId) =>
          posterLibrary.find(
            (poster) => poster.id === posterId
          )
        )
        .filter(
          (poster): poster is PosterItem =>
            Boolean(poster)
        ),
    [attachedPosterIds, posterLibrary]
  );

  const formatWebsiteDate = (value?: string) => {
    if (!value) return "Not entered";
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  };

  const websiteDetails = [
    { label: "Competition", value: event.eventName?.trim() || "Not entered" },
    { label: "Date", value: event.eventDate?.trim() || "Not entered" },
    { label: "1st Tee Time", value: event.firstTeeTime?.trim() || "Not entered" },
    { label: "Venue", value: event.venue?.trim() || DEFAULT_VENUE },
    { label: "Entries open", value: formatWebsiteDate(event.websiteEntriesOpen) },
    { label: "Entries close", value: formatWebsiteDate(event.websiteEntriesClose) },
    ...(event.competition?.trim() ? [{ label: "Competition type", value: event.competition.trim() }] : []),
    ...(event.competitionFormat?.trim() ? [{ label: "Format", value: event.competitionFormat.trim() }] : []),
    ...(Number(event.entryFee) >= 0 ? [{ label: "Entry fee", value: `£${event.entryFee}` }] : []),
    ...(Number(event.playerLimit) > 0 ? [{ label: "Maximum players", value: String(event.playerLimit) }] : []),
  ];

  // Advertise prize opportunities only, never the rewards themselves.
  // Titles already include categories such as Men/Ladies; on-course holes are public.
  const websitePrizeGroups = [
    { stream: "main", heading: "Overall competition prizes" },
    { stream: "additional", heading: "Additional competition prizes" },
    { stream: "onCourse", heading: "On-course prizes" },
    { stream: "special", heading: "Special event prizes" },
  ];

  const websitePrizeSections = websitePrizeGroups.flatMap(({ stream, heading }) => {
    const items = (event.prizes ?? []).filter(prize =>
      prize.stream === stream && prize.title?.trim()
    );
    if (!items.length) return [];
    return [{
      heading,
      body: items.map(prize => {
        const title = prize.title.trim();
        const hole = stream === "onCourse" && prize.hole?.trim()
          ? ` (Hole ${prize.hole.trim()})` : "";
        return `- ${title}${hole}`;
      }).join("\n"),
    }];
  });

  const websiteSections = [
    ...(event.websiteDescription?.trim() ? [{ heading: "Competition description", body: event.websiteDescription.trim() }] : []),
    ...websitePrizeSections,
    ...(event.competitionRules?.trim() ? [{ heading: "Additional competition information", body: event.competitionRules.trim() }] : []),
  ];

  // A one-page PDF generated locally; never modifies stored events or posters.
  const exportWebsitePdf = () => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 17;
    const width = 176;
    let y = 20;
    pdf.setFillColor(249, 225, 205);
    pdf.rect(0, 0, 210, 38, "F");
    pdf.setTextColor(166, 92, 40);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text("SOCIAL FAIRWAYS SOCIETY", margin, 17);
    pdf.setFontSize(10);
    pdf.text("SOCIETY EVENT DESK  |  WEBSITE PUBLICATION", margin, 25);
    y = 49;
    pdf.setFontSize(17);
    pdf.text("Competition Notification", margin, y);
    y += 11;
    pdf.setDrawColor(233, 213, 195);
    pdf.line(margin, y - 4, 193, y - 4);
    pdf.setFontSize(10);
    for (const { label, value } of websiteDetails) {
      const lines = pdf.splitTextToSize(value, 119) as string[];
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(70, 97, 123);
      pdf.text(label, margin, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(32, 55, 78);
      pdf.text(lines, 73, y);
      y += Math.max(8, lines.length * 5.1 + 3);
    }
    for (const section of websiteSections) {
      y += 5;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(166, 92, 40);
      pdf.text(section.heading, margin, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(32, 55, 78);
      const lines = pdf.splitTextToSize(section.body, width) as string[];
      const needed = lines.length * 5;
      if (y + needed > 274) {
        window.alert("The website information is too long for one A4 page. Please shorten the description or competition rules before exporting.");
        return;
      }
      pdf.text(lines, margin, y);
      y += needed;
    }
    if (y > 278) {
      window.alert("The website information exceeds one A4 page. Please shorten the details before exporting.");
      return;
    }
    pdf.setDrawColor(233, 213, 195);
    pdf.line(margin, 282, 193, 282);
    pdf.setFontSize(8);
    pdf.setTextColor(111, 130, 148);
    pdf.text("Prepared by Social Fairways Society Event Desk", margin, 288);
    const filename = (event.eventName || "Competition").replace(/[^a-z0-9_-]+/gi, "_");
    pdf.save(`${filename}_Website_Notification.pdf`);
  };
  useEffect(() => {

    try {

      localStorage.setItem(

        VENUE_STORAGE_KEY,

        JSON.stringify(venues)

      );

    } catch {

      // Venue retention is a convenience feature.

    }

  }, [venues]);

  useEffect(() => {

    if (!event.venue.trim()) {

      setEvent((current) => ({

        ...current,

        venue: DEFAULT_VENUE,

      }));

    }

  }, [event.venue, setEvent]);

  useEffect(() => {

    if (

      event.venue &&

      !venues.includes(event.venue)

    ) {

      setVenues((current) => [

        ...current,

        event.venue,

      ]);

    }

  }, [event.venue, venues]);

  const updateEvent = (

    changes: Partial<Event>

  ) => {

    setEvent((current) => ({

      ...current,

      ...changes,

      status:

        current.status === "published" ||

        current.status === "archived" ||

        current.status === "confirmed"

          ? "draft"

          : current.status ?? "draft",

    }));

  };

  const handleVenueChange = (

    value: string

  ) => {

    updateEvent({

      venue: value,

    });

  };

  const handleAddVenue = () => {
    setNewVenueName("");
    setShowAddVenue(true);
  };

  const confirmAddVenue = () => {
    const trimmedVenue = newVenueName.trim();

    if (!trimmedVenue) {
      return;
    }

    if (!venues.includes(trimmedVenue)) {
      setVenues((current) => [
        ...current,
        trimmedVenue,
      ]);
    }

    updateEvent({
      venue: trimmedVenue,
    });

    setNewVenueName("");
    setShowAddVenue(false);
  };

  const handleSaveClick = () => {

    if (attachedPosterIds.length === 0) {

      setShowPosterWarning(true);

      return;

    }

    setShowSaveConfirmation(true);

  };

  const confirmSave = () => {

    setEvent((current) => ({

      ...current,

      status: "confirmed",

    }));

    setShowSaveConfirmation(false);

  };

  const continueWithoutPoster = () => {

    setShowPosterWarning(false);

    setShowSaveConfirmation(true);

  };

  /*

   * EVENT PREVIEW

   *

   * Opens a separate, print-ready A4 document.

   * It does not modify the event and does not

   * require App.tsx navigation changes.

   */

  const handleEventPreview = () => {

    const previewWindow =

      window.open(

        "",

        "_blank",

        "width=900,height=1000"

      );

    if (!previewWindow) {

      window.alert(

        "The Event Preview could not be opened. Please allow pop-ups for Event Desk and try again."

      );

      return;

    }

    const eventName =

      event.eventName.trim() ||

      "Event name not entered";

    const venue =

      event.venue.trim() ||

      DEFAULT_VENUE;

    const competition =

      event.competition.trim() ||

      "Competition not entered";

    const eventDate =

      event.eventDate.trim() ||

      "Date not entered";

    const status =

      getStatusLabel(currentStatus);

    const competitionCategory =

      event.competitionCategory?.trim() ||

      "Not yet entered";

    const competitionFormat =

      event.competitionFormat?.trim() ||

      "Not yet entered";

    const competitionRounds =

      event.competitionRounds ??

      1;

    const handicapAllowance =

      event.handicapAllowance ??

      100;

    const teeColour =

      event.teeColour?.trim() ||

      "Not yet entered";

    const competitionRules =

      event.competitionRules?.trim();

    const mediaStatus =

      attachedPosterId

        ? "Event Media Attached"

        : "No Event Media Attached";

    /*
     * CATERING SUMMARY
     *
     * Read the same V4 catering record used by the Catering page.
     * This keeps the Core Event Details report in step with the live
     * Catering page instead of reading the retired catering data model.
     */
    let cateringPackage = "Not yet entered";
    let cateringEating = 0;
    let cateringDietary = 0;
    let cateringPaid = 0;
    let cateringOutstanding = 0;
    let cateringCharge = 0;

    try {
      const activeEventId = localStorage.getItem(ACTIVE_EVENT_ID_KEY);
      const records = JSON.parse(
        localStorage.getItem(EVENT_RECORDS_KEY) || "[]"
      ) as Array<{ id?: string; event?: { eventNumber?: string } }>;

      const matchingRecord = Array.isArray(records)
        ? records.find(
            (record) =>
              record?.id === activeEventId ||
              record?.event?.eventNumber === event.eventNumber
          )
        : undefined;

      const cateringRecordId =
        matchingRecord?.id || activeEventId || event.eventNumber;

      const savedCatering = localStorage.getItem(
        `${CATERING_KEY_PREFIX}${cateringRecordId}`
      );

      if (savedCatering) {
        const catering = JSON.parse(savedCatering) as {
          eating?: number;
          dietaryNeeds?: number;
          paid?: number;
          selectedPackage?: string | null;
          packages?: Array<{
            id?: string;
            name?: string;
            price?: number;
          }>;
        };

        cateringEating = Math.max(0, Math.floor(Number(catering.eating) || 0));
        cateringDietary = Math.min(
          cateringEating,
          Math.max(0, Math.floor(Number(catering.dietaryNeeds) || 0))
        );
        cateringPaid = Math.min(
          cateringEating,
          Math.max(0, Math.floor(Number(catering.paid) || 0))
        );
        cateringOutstanding = Math.max(0, cateringEating - cateringPaid);

        const selectedPackage = Array.isArray(catering.packages)
          ? catering.packages.find(
              (item) => item?.id === catering.selectedPackage
            )
          : undefined;

        if (selectedPackage?.name) {
          cateringPackage = selectedPackage.name;
        }

        const pricePerPerson = Math.max(
          0,
          Number(selectedPackage?.price) || 0
        );

        cateringCharge = cateringEating * pricePerPerson;
      }
    } catch {
      // Catering is supplementary to the core event report.
    }

    /*
     * FINANCIAL SUMMARY
     *
     * Read the same Financials record used by the Financials page.
     * Food Charge is read from the live Catering V4 record, so the
     * report uses the same calculation as the Financials page.
     */
    let financialSponsorship = 0;
    let financialSectionSupport = 0;
    let financialGreenFees = 0;
    let financialPrizeFund = 0;
    let financialMiscellaneous = 0;
    let financialCharity = 0;

    const financialEventId = (() => {
      try {
        const activeEventId = localStorage.getItem(ACTIVE_EVENT_ID_KEY);
        const records = JSON.parse(
          localStorage.getItem(EVENT_RECORDS_KEY) || "[]"
        ) as Array<{ id?: string; event?: { eventNumber?: string } }>;

        const matchingRecord = Array.isArray(records)
          ? records.find(
              (record) =>
                record?.id === activeEventId ||
                record?.event?.eventNumber === event.eventNumber
            )
          : undefined;

        return matchingRecord?.id || activeEventId || event.eventNumber;
      } catch {
        return event.eventNumber;
      }
    })();

    try {
      const savedFinancials = localStorage.getItem(
        `eventDeskFinancials:${financialEventId}`
      );

      if (savedFinancials) {
        const financials = JSON.parse(savedFinancials) as {
          sponsorship?: number;
          sectionSupport?: number;
          greenFees?: number;
          prizeFund?: number;
          miscellaneous?: number;
          charity?: number;
        };

        financialSponsorship = Math.max(
          0,
          Number(financials.sponsorship) || 0
        );
        financialSectionSupport = Math.max(
          0,
          Number(financials.sectionSupport) || 0
        );
        financialGreenFees = Math.max(
          0,
          Number(financials.greenFees) || 0
        );
        financialPrizeFund = Math.max(
          0,
          Number(financials.prizeFund) || 0
        );
        financialMiscellaneous = Math.max(
          0,
          Number(financials.miscellaneous) || 0
        );
        financialCharity = Math.max(
          0,
          Number(financials.charity) || 0
        );
      }
    } catch {
      // Financials are supplementary to the core event report.
    }

    const financialEntryFees = Math.max(
      0,
      Number(event.entryFee) || 0
    ) * Math.max(0, Number(players?.length) || 0);

    const financialBasicIncome =
      financialEntryFees +
      financialSponsorship +
      financialSectionSupport;

    const financialBasicOutgoings =
      financialGreenFees +
      cateringCharge +
      financialPrizeFund +
      financialMiscellaneous;

    const financialSurplusToSection =
      financialBasicIncome -
      financialBasicOutgoings -
      financialCharity;

    const formatReportCurrency = (value: number) =>
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);

    const parseReportDate = (value: string) => {
      const ddmmyyyy = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const date = new Date(
          Number(year),
          Number(month) - 1,
          Number(day)
        );

        if (
          date.getFullYear() === Number(year) &&
          date.getMonth() === Number(month) - 1 &&
          date.getDate() === Number(day)
        ) {
          return date;
        }
      }

      const isoDate = new Date(`${value}T00:00:00`);
      return Number.isNaN(isoDate.getTime()) ? null : isoDate;
    };

    const cateringDeadline = (() => {
      const date = parseReportDate(event.eventDate);
      if (!date) return "Not available";

      date.setDate(date.getDate() - 14);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    })();

    const dateDisplay = weekday

      ? `${eventDate} — ${weekday}`

      : eventDate;

    previewWindow.document.write(`

      <!DOCTYPE html>

      <html lang="en">

      <head>

        <meta charset="UTF-8" />

        <meta

          name="viewport"

          content="width=device-width, initial-scale=1.0"

        />

        <title>

          Event ${escapeHtml(event.eventNumber)}

          - ${escapeHtml(eventName)}

        </title>

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

            background: #e9eef4;

            color: #4b3b32;

            font-family:

              "Helvetica Neue",

              Helvetica,

              Arial,

              sans-serif;

          }

          body {

            padding: 24px;

          }

          .preview-controls {

            width: 210mm;

            max-width: 100%;

            margin: 0 auto 18px;

            display: flex;

            justify-content: center;

            gap: 12px;

          }

          .preview-controls button {

            border: 1px solid #cb844c;

            border-radius: 9px;

            padding: 10px 20px;

            background: white;

            color: #a65c28;

            font-size: 14px;

            font-weight: 700;

            cursor: pointer;

          }

          .preview-controls button.primary {

            background: #cb844c;

            color: white;

            border-color: #cb844c;

          }

          .preview-controls button\:hover {

            box-shadow:

              0 5px 14px

              rgba(31, 95, 191, 0.18);

            transform: translateY(-1px);

          }

          .event-document {

            width: 210mm;

            min-height: 297mm;

            max-width: 100%;

            margin: 0 auto;

            padding: 15mm;

            background: white;

            box-shadow:

              0 8px 30px

              rgba(0, 0, 0, 0.14);

          }

          .document-header {

            text-align: center;

            border-bottom: 3px solid #cb844c;

            padding-bottom: 12px;

            margin-bottom: 18px;

          }

          .document-header .organisation {

            font-size: 13px;

            font-weight: 700;

            letter-spacing: 1.5px;

            color: #76685e;

            text-transform: uppercase;

          }

          .document-header h1 {

            margin: 5px 0 3px;

            font-size: 27px;

            line-height: 1.15;

            color: #884a24;

          }

          .document-header .document-title {

            font-size: 15px;

            font-weight: 700;

            color: #76685e;

            letter-spacing: 0.8px;

            text-transform: uppercase;

          }

          .event-heading {

            display: grid;

            grid-template-columns: 82px 1fr auto;

            gap: 15px;

            align-items: center;

            margin-bottom: 18px;

          }

          .event-number {

            background: #fff0e2;

            border: 1px solid #e9d5c3;

            border-radius: 9px;

            padding: 9px 6px;

            text-align: center;

          }

          .event-number span {

            display: block;

            font-size: 10px;

            font-weight: 800;

            color: #76685e;

            letter-spacing: 1px;

          }

          .event-number strong {

            display: block;

            margin-top: 2px;

            font-size: 21px;

            color: #a65c28;

          }

          .event-title h2 {

            margin: 0;

            font-size: 21px;

            line-height: 1.2;

            color: #884a24;

          }

          .event-title p {

            margin: 4px 0 0;

            font-size: 13px;

            color: #76685e;

          }

          .status {

            padding: 7px 12px;

            border-radius: 999px;

            background: ${

              currentStatus === "published"

                ? "#ecfdf3"

                : currentStatus === "archived"

                ? "#f1f5f9"

                : "#fff7ed"

            };

            color: ${

              currentStatus === "published"

                ? "#15803d"

                : currentStatus === "archived"

                ? "#64748b"

                : "#c2410c"

            };

            font-size: 12px;

            font-weight: 800;

            white-space: nowrap;

          }

          .section {

            margin-top: 15px;

          }

          .section-heading {

            margin: 0 0 7px;

            padding: 6px 10px;

            background: #fff0e2;

            border-left: 4px solid #d9a17a;

            color: #a65c28;

            font-size: 13px;

            font-weight: 800;

            letter-spacing: 0.4px;

            text-transform: uppercase;

          }

          .financial-group-heading {

            margin: 9px 0 5px;

            padding: 5px 9px;

            border-radius: 5px;

            font-size: 11px;

            font-weight: 800;

            letter-spacing: 0.5px;

            text-transform: uppercase;

          }

          .financial-group-heading.income {

            background: #eaf6ee;

            color: #24733d;

          }

          .financial-group-heading.outgoing {

            background: #fbeeee;

            color: #a13a3a;

          }

          .financial-income .detail-label,
          .financial-income .detail-value {

            color: #24733d;

          }

          .financial-outgoing .detail-label,
          .financial-outgoing .detail-value {

            color: #a13a3a;

          }

          .financial-total {

            display: flex;

            justify-content: space-between;

            align-items: center;

            margin-top: 5px;

            padding: 8px 11px;

            border-radius: 6px;

            font-size: 12px;

            font-weight: 800;

          }

          .financial-total strong {

            font-size: 13px;

          }

          .income-total {

            background: #eaf6ee;

            border: 1px solid #b9dec3;

            color: #24733d;

          }

          .outgoing-total {

            background: #fbeeee;

            border: 1px solid #e8c1c1;

            color: #a13a3a;

          }

          .financial-result-grid {

            margin-top: 9px;

          }

          .charity-row {

            background: #fff8f8;

          }

          .surplus-row .detail-label,
          .surplus-row .detail-value {

            color: #a65c28;

            font-weight: 800;

          }

          .surplus-row {

            background: #fff0e2;

          }

          .details-grid {

            display: grid;

            grid-template-columns: 1fr 1fr;

            border: 1px solid #e9d5c3;

            border-radius: 7px;

            overflow: hidden;

          }

          .detail {

            display: grid;

            grid-template-columns: 42% 58%;

            min-height: 30px;

            border-bottom: 1px solid #f1e3d6;

          }

          .detail\:nth-child(odd) {

            border-right: 1px solid #f1e3d6;

          }

          .detail\:nth-last-child(-n + 2) {

            border-bottom: none;

          }

          .detail-label {

            padding: 7px 9px;

            background: #fffaf6;

            font-size: 11px;

            font-weight: 700;

            color: #76685e;

          }

          .detail-value {

            padding: 7px 9px;

            font-size: 12px;

            font-weight: 600;

            color: #4b3b32;

          }

          .rules-box {

            border: 1px solid #e9d5c3;

            border-radius: 7px;

            padding: 10px 12px;

            min-height: 48px;

            font-size: 12px;

            line-height: 1.45;

            color: #5f5148;

          }

          .media-status {

            border: 1px solid #e9d5c3;

            border-radius: 7px;

            padding: 9px 12px;

            font-size: 12px;

            font-weight: 600;

            color: #5f5148;

          }

          .document-footer {

            margin-top: 18px;

            padding-top: 9px;

            border-top: 1px solid #e9d5c3;

            display: flex;

            justify-content: space-between;

            gap: 15px;

            font-size: 10px;

            color: #7a8796;

          }

          @media print {

            html,

            body {

              background: white;

              padding: 0;

              margin: 0;

            }

            .preview-controls {

              display: none;

            }

            .event-document {

              width: 210mm;

              height: 297mm;

              min-height: 297mm;

              max-width: 210mm;

              margin: 0;

              padding: 8mm;

              box-shadow: none;

              overflow: hidden;

              page-break-after: avoid;

              page-break-before: avoid;

            }

            .document-header {

              padding-bottom: 8px;

              margin-bottom: 10px;

            }

            .event-heading {

              margin-bottom: 10px;

            }

            .section {

              margin-top: 8px;

            }

            .section-heading {

              margin-bottom: 5px;

              padding: 5px 8px;

            }

            .detail {

              min-height: 26px;

            }

            .detail-label,
            .detail-value {

              padding: 5px 8px;

            }

            .rules-box {

              padding: 7px 9px;

              min-height: 40px;

            }

            .financial-group-heading {

              margin: 6px 0 4px;

              padding: 4px 8px;

            }

            .financial-total {

              margin-top: 4px;

              padding: 6px 9px;

            }

            .financial-result-grid {

              margin-top: 6px;

            }

            .document-footer {

              margin-top: 10px;

              padding-top: 6px;

            }

          }

        </style>

      </head>

      <body>

        <div class="preview-controls">

          <button

            type="button"

            class="primary"

            onclick="window.print()"

          >

            Print / Export PDF — A4

          </button>

          <button

            type="button"

            onclick="window.close()"

          >

            Close Preview

          </button>

        </div>

        <article class="event-document">

          <header class="document-header">

            <div class="organisation">

              Social Fairways Society

            </div>

            <h1>

              Social Fairways Society

            </h1>

            <div class="document-title">

              Event Details

            </div>

          </header>

          <section class="event-heading">

            <div class="event-number">

              <span>EVENT</span>

              <strong>

                ${escapeHtml(event.eventNumber)}

              </strong>

            </div>

            <div class="event-title">

              <h2>

                ${escapeHtml(eventName)}

              </h2>

              <p>

                ${escapeHtml(dateDisplay)}

                &nbsp;•&nbsp;

                ${escapeHtml(venue)}

              </p>

            </div>

            <div class="status">

              ${escapeHtml(status)}

            </div>

          </section>

          <section class="section">

            <h3 class="section-heading">

              Event Information

            </h3>

            <div class="details-grid">

              <div class="detail">

                <div class="detail-label">

                  Event Number

                </div>

                <div class="detail-value">

                  ${escapeHtml(event.eventNumber)}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Event Status

                </div>

                <div class="detail-value">

                  ${escapeHtml(status)}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Event Name

                </div>

                <div class="detail-value">

                  ${escapeHtml(eventName)}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Event Date

                </div>

                <div class="detail-value">

                  ${escapeHtml(dateDisplay)}

                </div>

              </div>

              <div class="detail">
                <div class="detail-label">1st Tee Time</div>
                <div class="detail-value">${escapeHtml(event.firstTeeTime?.trim() || "Not entered")}</div>
              </div>

              <div class="detail">

                <div class="detail-label">

                  Venue

                </div>

                <div class="detail-value">

                  ${escapeHtml(venue)}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Competition

                </div>

                <div class="detail-value">

                  ${escapeHtml(competition)}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Entry Fee

                </div>

                <div class="detail-value">

                  £${escapeHtml(

                    String(event.entryFee)

                  )}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Maximum Players

                </div>

                <div class="detail-value">

                  ${escapeHtml(

                    String(event.playerLimit)

                  )}

                </div>

              </div>

            </div>

          </section>

          <section class="section">

            <h3 class="section-heading">

              Competition Setup

            </h3>

            <div class="details-grid">

              <div class="detail">

                <div class="detail-label">

                  Category

                </div>

                <div class="detail-value">

                  ${escapeHtml(

                    competitionCategory

                  )}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Format

                </div>

                <div class="detail-value">

                  ${escapeHtml(

                    competitionFormat

                  )}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Rounds

                </div>

                <div class="detail-value">

                  ${escapeHtml(

                    String(competitionRounds)

                  )}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Handicap Allowance

                </div>

                <div class="detail-value">

                  ${escapeHtml(

                    String(handicapAllowance)

                  )}%

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Tee Colour

                </div>

                <div class="detail-value">

                  ${escapeHtml(teeColour)}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Event Media

                </div>

                <div class="detail-value">

                  ${escapeHtml(mediaStatus)}

                </div>

              </div>

            </div>

          </section>

          <section class="section">

            <h3 class="section-heading">

              Competition Rules

            </h3>

            <div class="rules-box">

              ${

                competitionRules

                  ? formatRules(

                      competitionRules

                    )

                  : "No competition rules have been entered at this stage."

              }

            </div>

          </section>

          <section class="section">

            <h3 class="section-heading">

              Catering

            </h3>

            <div class="details-grid">

              <div class="detail">

                <div class="detail-label">

                  Meal Package

                </div>

                <div class="detail-value">

                  ${escapeHtml(cateringPackage)}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Number Eating

                </div>

                <div class="detail-value">

                  ${escapeHtml(String(cateringEating))}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Dietary Needs

                </div>

                <div class="detail-value">

                  ${escapeHtml(String(cateringDietary))}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Paid

                </div>

                <div class="detail-value">

                  ${escapeHtml(String(cateringPaid))}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Outstanding

                </div>

                <div class="detail-value">

                  ${escapeHtml(String(cateringOutstanding))}

                </div>

              </div>

              <div class="detail">

                <div class="detail-label">

                  Catering Charge

                </div>

                <div class="detail-value">

                  ${escapeHtml(formatReportCurrency(cateringCharge))}

                </div>

              </div>
              <div class="detail">

                <div class="detail-label">

                  Kitchen Confirmation Deadline

                </div>

                <div class="detail-value">

                  ${escapeHtml(cateringDeadline)}

                </div>

              </div>

            </div>

          </section>

          <section class="section">

            <h3 class="section-heading">
              Financials
            </h3>

            <div class="financial-group-heading income">Income</div>

            <div class="details-grid financial-income-grid">

              <div class="detail financial-income">
                <div class="detail-label">
                  Entry Fees
                </div>
                <div class="detail-value">
                  ${escapeHtml(formatReportCurrency(financialEntryFees))}
                </div>
              </div>

              <div class="detail financial-income">
                <div class="detail-label">
                  Sponsorship
                </div>
                <div class="detail-value">
                  ${escapeHtml(formatReportCurrency(financialSponsorship))}
                </div>
              </div>

              <div class="detail financial-income">
                <div class="detail-label">
                  Section Support
                </div>
                <div class="detail-value">
                  ${escapeHtml(formatReportCurrency(financialSectionSupport))}
                </div>
              </div>

            </div>

            <div class="financial-total income-total">
              <span>Basic Income</span>
              <strong>${escapeHtml(formatReportCurrency(financialBasicIncome))}</strong>
            </div>

            <div class="financial-group-heading outgoing">Outgoings</div>

            <div class="details-grid financial-outgoing-grid">

              <div class="detail financial-outgoing">
                <div class="detail-label">
                  Green Fees
                </div>
                <div class="detail-value">
                  ${escapeHtml(formatReportCurrency(financialGreenFees))}
                </div>
              </div>

              <div class="detail financial-outgoing">
                <div class="detail-label">
                  Food Charge
                </div>
                <div class="detail-value">
                  ${escapeHtml(formatReportCurrency(cateringCharge))}
                </div>
              </div>

              <div class="detail financial-outgoing">
                <div class="detail-label">
                  Prize Fund
                </div>
                <div class="detail-value">
                  ${escapeHtml(formatReportCurrency(financialPrizeFund))}
                </div>
              </div>

              <div class="detail financial-outgoing">
                <div class="detail-label">
                  Miscellaneous
                </div>
                <div class="detail-value">
                  ${escapeHtml(formatReportCurrency(financialMiscellaneous))}
                </div>
              </div>

            </div>

            <div class="financial-total outgoing-total">
              <span>Basic Outgoings</span>
              <strong>${escapeHtml(formatReportCurrency(financialBasicOutgoings))}</strong>
            </div>

            <div class="details-grid financial-result-grid">

              <div class="detail financial-outgoing charity-row">
                <div class="detail-label">
                  Charity
                </div>
                <div class="detail-value">
                  ${escapeHtml(formatReportCurrency(financialCharity))}
                </div>
              </div>

              <div class="detail financial-surplus surplus-row">
                <div class="detail-label">
                  Surplus to Section
                </div>
                <div class="detail-value">
                  ${escapeHtml(formatReportCurrency(financialSurplusToSection))}
                </div>
              </div>

            </div>

          </section>

          <footer class="document-footer">

            <span>

              Social Fairways Society Event Desk

            </span>

            <span>

              Event ${escapeHtml(

                event.eventNumber

              )}

            </span>

          </footer>

        </article>

        <script>

          window.addEventListener(

            "load",

            function () {

              window.focus();

            }

          );

        </script>

      </body>

      </html>

    `);

    previewWindow.document.close();

    previewWindow.focus();

  };

  const playerLimit =

    Number(event.playerLimit);

  const playerLimitWarning =

    playerLimit < 32

      ? {

          variant: "danger" as const,

          message:

            "Small field — consider event viability.",

        }

      : playerLimit > 72

        ? {

            variant: "danger" as const,

            message:

              "Large field — consider venue and format capacity.",

          }

        : playerLimit % 4 !== 0

          ? {

              variant: "warning" as const,

              message:

                "Field is not a multiple of 4 — consider adjusting the number.",

            }

          : {

              variant: "success" as const,

              message:

                "Suitable field size.",

            };

  const summary = (

    <div className="players-summary">

      <SummaryCard

        title="Event No."

        value={event.eventNumber}

      />

      <SummaryCard

        title="Status"

        value={getStatusLabel(

          currentStatus

        )}

        variant={getStatusVariant(

          currentStatus

        )}

      />

      <SummaryCard

        title="Venue"

        value={

          event.venue ||

          DEFAULT_VENUE

        }

        variant="venue"

      />

      <SummaryCard

        title="Players"

        value={`${players.length} / ${event.playerLimit}`}

      />

      <SummaryCard

        title="Entry Fee"

        value={`£${event.entryFee}`}

      />

    </div>

  );

  const checklistWarning = useMemo<"amber" | "red" | undefined>(() => {
    try {
      const saved = localStorage.getItem(
        `${CHECKLIST_STORAGE_PREFIX}${event.eventNumber}`
      );

      if (!saved) return undefined;

      const tasks = JSON.parse(saved) as Array<{
        status?: string;
        dueDate?: string;
      }>;

      if (!Array.isArray(tasks)) return undefined;

      const today = new Date();
      const todayUtc = Date.UTC(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      let hasDueSoon = false;

      for (const task of tasks) {
        if (task.status === "complete" || !task.dueDate) continue;

        const [year, month, day] = task.dueDate.split("-").map(Number);
        if (!year || !month || !day) continue;

        const dueUtc = Date.UTC(year, month - 1, day);
        const daysUntilDue = Math.round(
          (dueUtc - todayUtc) / 86400000
        );

        if (daysUntilDue < 0) {
          return "red";
        }

        if (daysUntilDue <= 7) {
          hasDueSoon = true;
        }
      }

      return hasDueSoon ? "amber" : undefined;
    } catch (error) {
      console.error("Failed to read checklist warning status", error);
      return undefined;
    }
  }, [event.eventNumber]);

  const actions = (

    <div className="players-actions">

      <ActionTile

        icon={Save}

        title={

          currentStatus === "published"

            ? "Reconfirm"

            : "Save"

        }

        primary

        onClick={

          handleSaveClick

        }

      />

      <ActionTile

        icon={FolderOpen}

        title="Planning Aid"

        subtitle="Off"

        onClick={onOpenPlanningAid}

      />

      <ActionTile

        icon={ClipboardList}

        title="To Do / Checklist"

        subtitle="Event"

        warning={checklistWarning}

        onClick={onOpenChecklist}

      />

       <ActionTile
         icon={Mail}
         title="Website Notification"
         subtitle="Preview & Export PDF"
         onClick={() => setShowWebsiteNotification(true)}
       />

      <ActionTile

        icon={Eye}

        title="Event Preview"

        subtitle="Core"

        primary

        onClick={

          handleEventPreview

        }

      />

    </div>

  );

  return (

    <>

      <PageLayout

        title="Event Details"

        subtitle="Create and configure a new Social Fairways Society event."

        summary={summary}

        actions={actions}

        footer="Complete and confirm the fundamental event details before moving on to Competition Setup."

      >

        <div className="event-details">

          <div className="form-grid">

            <div className="field full-width">

              <label>

                Event Name

              </label>

              <input

                type="text"

                value={

                  event.eventName

                }

                onChange={(e) =>

                  updateEvent({

                    eventName:

                      e.target.value,

                  })

                }

              />

            </div>

            <div className="field">

              <label>

                Event Date

              </label>

              <input

                type="text"

                value={

                  event.eventDate

                }

                placeholder="DD/MM/YYYY"

                onChange={(e) =>

                  updateEvent({

                    eventDate:

                      e.target.value,

                  })

                }

              />

              <div className="field-help">

                {weekday

                  ? ` ${weekday}`

                  : "Please enter the date as DD/MM/YYYY"}

              </div>

            </div>

            <div className="field">
              <label htmlFor="first-tee-time">1st Tee Time</label>
              <input
                id="first-tee-time"
                type="time"
                value={event.firstTeeTime ?? ""}
                onChange={(e) => updateEvent({ firstTeeTime: e.target.value })}
              />
              <div className="field-help">First scheduled tee time (24-hour clock).</div>
            </div>

            <div className="field">

              <label>

                Venue

              </label>

              <select

                value={

                  event.venue ||

                  DEFAULT_VENUE

                }

                onChange={(e) =>

                  handleVenueChange(

                    e.target.value

                  )

                }

              >

                {!venues.includes(

                  event.venue

                ) &&

                  event.venue && (

                    <option

                      value={

                        event.venue

                      }

                    >

                      {event.venue}

                    </option>

                  )}

                {venues.map(

                  (venue) => (

                    <option

                      key={venue}

                      value={venue}

                    >

                      {venue}

                    </option>

                  )

                )}

                </select>

              <button

                type="button"

                onClick={handleAddVenue}

                style={{

                  marginTop: "8px",

                  padding: "8px 14px",

                  border: "1px solid #cb844c",

                  borderRadius: "7px",

                  background: "#ffffff",

                  color: "#a65c28",

                  fontSize: "14px",

                  fontWeight: 700,

                  cursor: "pointer",

                }}

              >

                + Add Venue

              </button>

            </div>

            <div className="field">

              <label>

                Competition

              </label>

              <input

                type="text"

                value={

                  event.competition

                }

                onChange={(e) =>

                  updateEvent({

                    competition:

                      e.target.value,

                  })

                }

              />

            </div>

            <div className="field">

              <label>

                Entry Fee

              </label>

              <input

                type="number"

                min="0"

                step="1"

                value={

                  event.entryFee

                }

                onChange={(e) =>

                  updateEvent({

                    entryFee:

                      Number(

                        e.target.value

                      ),

                  })

                }

              />

            </div>

            <div className="field">

              <label>

                Maximum Players

              </label>

              <input

                type="number"

                min="0"

                step="4"

                value={

                  event.playerLimit

                }

                onChange={(e) =>

                  updateEvent({

                    playerLimit:

                      Number(

                        e.target.value

                      ),

                  })

                }

              />

              <div

                className={`field-help player-limit-${playerLimitWarning.variant}`}

              >

                {

                  playerLimitWarning.message

                }

              </div>

            </div>

            <div className="field">

              <label>

                Priority Event

              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minHeight: "44px",
                  padding: "0 12px",
                  border: "1px solid #e9d5c3",
                  borderRadius: "7px",
                  background: event.priority ? "#fff9e8" : "#ffffff",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(event.priority)}
                  onChange={(e) =>
                    onPriorityChange(e.target.checked)
                  }
                  style={{
                    width: "18px",
                    height: "18px",
                    margin: 0,
                  }}
                />
                <span style={{ fontWeight: 700, color: "#5f5148" }}>
                  Make this the Priority event
                </span>
              </label>

              <div className="field-help">
                Only one event can be Priority. It will appear first on the Event Desk.
              </div>

            </div>

          </div>

          <section className="event-poster-section" aria-label="Website Publication Details">
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 700, color: "#a65c28" }}>
              <input type="checkbox" checked={showWebsitePublicationDetails}
                onChange={(e) => setShowWebsitePublicationDetails(e.target.checked)}
                style={{ width: 18, height: 18, margin: 0 }} />
              Show Website Publication Details
            </label>
            {showWebsitePublicationDetails && <div style={{ marginTop: 14 }}>
            <h2>Website Publication Details</h2>
            <p className="field-help">For the WordPress administrator only. These dates do not control player entries.</p>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="website-entries-open">Entries Open</label>
                <input id="website-entries-open" type="date"
                  value={event.websiteEntriesOpen ?? ""}
                  onChange={(e) => updateEvent({ websiteEntriesOpen: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="website-entries-close">Entries Close</label>
                <input id="website-entries-close" type="date"
                  value={event.websiteEntriesClose ?? ""}
                  onChange={(e) => updateEvent({ websiteEntriesClose: e.target.value })} />
              </div>
              <div className="field full-width">
                <label htmlFor="website-description">Brief Website Description</label>
                <textarea id="website-description" rows={4}
                  placeholder="Brief description for the website administrator"
                  value={event.websiteDescription ?? ""}
                  onChange={(e) => updateEvent({ websiteDescription: e.target.value })}
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }} />
              </div>
            </div>
            </div>}
          </section>

          <div className="event-poster-section">
            <h2>
              Event Media
            </h2>

            <div
              className="poster-attachment-box"
              style={{
                minHeight: "260px",
                border: "2px dashed #e9d5c3",
                borderRadius: "14px",
                background: "#fffaf6",
                padding: "24px",
                marginTop: "12px",
              }}
            >
              {attachedPosters.length > 0 ? (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        attachedPosters.length === 1
                          ? "minmax(180px, 320px)"
                          : "repeat(3, minmax(0, 1fr))",
                      gap: "18px",
                      alignItems: "start",
                      justifyContent: "center",
                    }}
                  >
                    {attachedPosters.map((poster) => (
                      <div
                        key={poster.id}
                        style={{
                          background: "white",
                          border: "1px solid #e9d5c3",
                          borderRadius: "10px",
                          padding: "10px",
                          boxShadow:
                            "0 2px 8px rgba(31,91,159,0.08)",
                        }}
                      >
                        <EventMediaThumbnail
                          poster={poster}
                          single={attachedPosters.length === 1}
                        />
                        <div
                          style={{
                            marginTop: "8px",
                            color: "#a65c28",
                            fontSize: "13px",
                            fontWeight: 700,
                            textAlign: "center",
                          }}
                        >
                          {poster.title}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p
                    style={{
                      margin: "18px 0 16px",
                      color: "#666",
                      fontSize: "14px",
                      textAlign: "center",
                    }}
                  >
                    {attachedPosters.length === 1
                      ? "1 promotional asset is attached to this event."
                      : `${attachedPosters.length} promotional assets are attached to this event.`}
                  </p>
                </>
              ) : (
                <div
                  style={{
                    minHeight: "190px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "96px",
                      height: "96px",
                      borderRadius: "10px",
                      background: "#fff0e2",
                      border: "1px solid #e9d5c3",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "42px",
                      marginBottom: "18px",
                    }}
                  >
                    🖼️
                  </div>
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      color: "#a65c28",
                      fontSize: "21px",
                    }}
                  >
                    No Event Media Attached
                  </h3>
                  <p
                    style={{
                      margin: "0 0 20px 0",
                      color: "#666",
                      fontSize: "15px",
                    }}
                  >
                    A promotional asset is normally required for an event.
                  </p>
                </div>
              )}

              <div style={{ textAlign: "center" }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={onAttachPoster}
                >
                  {attachedPosters.length > 0
                    ? "Change Media"
                    : "Attach Event Media"}
                </button>
              </div>
            </div>
          </div>

        </div>

      {showWebsiteNotification && (
        <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20,40,65,.55)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div role="dialog" aria-modal="true" aria-label="Website Notification Pro Forma" style={{ width: "min(760px, 100%)", maxHeight: "90vh", overflowY: "auto", background: "white", borderRadius: 14, padding: 24, boxShadow: "0 14px 45px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h2 style={{ margin: 0, color: "#a65c28" }}>Website Notification — A4 Pro Forma</h2>
              <button type="button" onClick={() => setShowWebsiteNotification(false)}>Close</button>
            </div>
            <p style={{ color: "#76685e" }}>Review the information below, then export a single-page PDF to attach to your own email alongside the event poster.</p>
            <div style={{ background: "white", border: "1px solid #e9d5c3", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: 18, background: "#f9e1cd", color: "#a65c28" }}>
                <strong>SOCIAL FAIRWAYS SOCIETY</strong>
                <div style={{ fontSize: 12, marginTop: 4 }}>SOCIETY EVENT DESK · WEBSITE PUBLICATION</div>
              </div>
              <div style={{ padding: 20 }}>
                <h3 style={{ marginTop: 0, color: "#a65c28" }}>Competition Notification</h3>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(125px, 32%) 1fr", gap: "9px 14px" }}>
                  {websiteDetails.map(({ label, value }) => (
                    <div key={label} style={{ display: "contents" }}>
                      <strong style={{ color: "#76685e" }}>{label}</strong>
                      <span style={{ overflowWrap: "anywhere" }}>{value}</span>
                    </div>
                  ))}
                </div>
                {websiteSections.map(section => (
                  <section key={section.heading} style={{ marginTop: 19 }}>
                    <h4 style={{ color: "#a65c28", margin: "0 0 6px" }}>{section.heading}</h4>
                    <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{section.body}</div>
                  </section>
                ))}
                <p style={{ marginTop: 25, borderTop: "1px solid #e9d5c3", paddingTop: 9, color: "#76685e", fontSize: 11 }}>Prepared by Social Fairways Society Event Desk</p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => setShowWebsiteNotification(false)}>Close</button>
              <button type="button" className="primary-button" onClick={exportWebsitePdf}>Export PDF — A4</button>
            </div>
          </div>
        </div>
      )}

      </PageLayout>

      {showAddVenue && (
        <div
          className="event-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "rgba(18, 35, 56, 0.42)",
          }}
        >
          <div
            className="event-modal"
            style={{
              width: "min(520px, calc(100vw - 48px))",
              maxWidth: "520px",
              margin: 0,
              padding: "26px 28px",
              borderRadius: "14px",
              background: "#ffffff",
              boxShadow: "0 18px 55px rgba(0, 0, 0, 0.28)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Add Venue</h2>
            <p>Enter the new venue name. It will be retained in the Venue list for future events.</p>
            <input
              type="text"
              value={newVenueName}
              autoFocus
              placeholder="Venue name"
              onChange={(e) => setNewVenueName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newVenueName.trim()) {
                  confirmAddVenue();
                }
                if (e.key === "Escape") {
                  setShowAddVenue(false);
                  setNewVenueName("");
                }
              }}
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginTop: "8px",
                padding: "10px 12px",
                border: "1px solid #e9d5c3",
                borderRadius: "7px",
                fontSize: "15px",
              }}
            />
            <div className="event-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowAddVenue(false);
                  setNewVenueName("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={!newVenueName.trim()}
                onClick={confirmAddVenue}
              >
                Add Venue
              </button>
            </div>
          </div>
        </div>
      )}

      {showPosterWarning && (

        <div className="event-modal-backdrop">

          <div className="event-modal">

            <h2>

              Event Media Not Attached

            </h2>

            <p>

              This event does not currently

              have a promotional asset attached.

            </p>

            <p>

              Event Media is normally required,

              but this will not prevent you from

              confirming the event.

            </p>

            <div className="event-modal-actions">

              <button

                type="button"

                className="secondary-button"

                onClick={() =>

                  setShowPosterWarning(

                    false

                  )

                }

              >

                Cancel

              </button>

              <button

                type="button"

                className="primary-button"

                onClick={

                  continueWithoutPoster

                }

              >

                Confirm Anyway

              </button>

            </div>

          </div>

        </div>

      )}

      {showSaveConfirmation && (

        <div className="event-modal-backdrop">

          <div className="event-modal">

            <h2>

              Confirm Event Details

            </h2>

            <p>

              These are the fundamental details

              for this event. Please check them

              carefully before confirming.

            </p>

            <div
              className="event-confirmation-summary"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "12px",
                padding: "16px",
                margin: "14px 0 20px",
                border: "1px solid #e9d5c3",
                borderRadius: "10px",
                background: "#fffaf6",
              }}
            >
              {[
                { label: "Event", value: event.eventName || "Not entered" },
                {
                  label: "Date",
                  value: `${event.eventDate}${weekday ? ` — ${weekday}` : ""}`,
                },
                { label: "1st Tee Time", value: event.firstTeeTime || "Not entered" },
                { label: "Venue", value: event.venue || DEFAULT_VENUE },
                {
                  label: "Competition",
                  value: event.competition || "Not entered",
                },
                { label: "Entry Fee", value: `£${event.entryFee}` },
                { label: "Maximum Players", value: String(event.playerLimit) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    minWidth: 0,
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "#fff",
                    border: "1px solid #e9d5c3",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#76685e", marginBottom: "5px" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 650, color: "#884a24", overflowWrap: "anywhere" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="event-modal-actions">

              <button

                type="button"

                className="secondary-button"

                onClick={() =>

                  setShowSaveConfirmation(

                    false

                  )

                }

              >

                Cancel

              </button>

              <button

                type="button"

                className="primary-button"

                onClick={

                  confirmSave

                }

              >

                Confirm & Save

              </button>

            </div>

          </div>

        </div>

      )}

    </>

  );

}