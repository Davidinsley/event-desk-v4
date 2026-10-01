import { ArrowLeft, Gauge, PieChart } from "lucide-react";
import { useEffect, useState } from "react";
import type { Event } from "../types/Event";
import type { Player } from "../types/Player";

interface PlanningAidProps {
  event: Event;
  players: Player[];
  onBack: () => void;
}

interface PlanningAidSettings {
  enabled: boolean;
  promotionRequired: boolean | null;
  cateringRequired: boolean | null;
  minimumViableField: number | null;
  drawRequired: boolean | null;
  prizesRequired: boolean | null;
  activatedDate: string | null;
  activationDaysUntilEvent: number | null;
  promotionIssued: boolean | null;
  fieldSetupReady: boolean | null;
  financialModelAgreed: boolean | null;
  financialLiabilityAgreed: "yes" | "no" | "na" | null;
  produceBooklet: boolean | null;
  resultsPublished: boolean | null;
}

const STORAGE_PREFIX = "eventDeskPlanningAidV1:";

const defaultSettings: PlanningAidSettings = {
  enabled: false,
  promotionRequired: null,
  cateringRequired: null,
  minimumViableField: null,
  drawRequired: null,
  prizesRequired: null,
  activatedDate: null,
  activationDaysUntilEvent: null,
  promotionIssued: null,
  fieldSetupReady: null,
  financialModelAgreed: null,
  financialLiabilityAgreed: null,
  produceBooklet: null,
  resultsPublished: null,
};


type ReadinessState = "green" | "amber" | "red" | "grey";

interface ReadinessItem {
  label: string;
  state: ReadinessState;
  detail: string;
}

type PaceState =
  | "well-ahead"
  | "ahead"
  | "on-pace"
  | "slightly-behind"
  | "attention";

interface PaceMilestone {
  label: string;
  weight: number;
  dueDays: number;
  achieved: boolean;
  applicable: boolean;
  fastReactionForgiven?: boolean;
}

const readinessColours: Record<
  ReadinessState,
  { background: string; border: string; text: string; dot: string }
> = {
  green: {
    background: "#f0fdf4",
    border: "#bbf7d0",
    text: "#166534",
    dot: "#22c55e",
  },
  amber: {
    background: "#fffbeb",
    border: "#fde68a",
    text: "#92400e",
    dot: "#f59e0b",
  },
  red: {
    background: "#fef2f2",
    border: "#fecaca",
    text: "#991b1b",
    dot: "#ef4444",
  },
  grey: {
    background: "#f8fafc",
    border: "#e2e8f0",
    text: "#64748b",
    dot: "#94a3b8",
  },
};

const CATERING_KEY_PREFIX = "eventDeskCateringV1:";
const EVENT_RECORDS_KEY = "eventDeskEventRecords";

interface CateringSnapshot {
  clubAdvised?: boolean;
}

interface StoredEventRecord {
  id?: string;
  event?: { eventNumber?: string };
}

const readClubAdvised = (eventNumber: string) => {
  try {
    const records = JSON.parse(localStorage.getItem(EVENT_RECORDS_KEY) || "[]") as StoredEventRecord[];
    const matchingRecord = Array.isArray(records)
      ? records.find((record) => record.event?.eventNumber === eventNumber)
      : undefined;
    if (!matchingRecord?.id) return false;
    const saved = localStorage.getItem(`${CATERING_KEY_PREFIX}${matchingRecord.id}`);
    if (!saved) return false;
    return (JSON.parse(saved) as CateringSnapshot).clubAdvised === true;
  } catch {
    return false;
  }
};


const FIELD_MANAGEMENT_KEY_PREFIX = "event-desk-field-management-draw-v4";

interface FieldManagementSnapshot {
  proposedDraw?: unknown[];
  confirmedDraw?: unknown[];
  drawConfirmed?: boolean;
}

const readFieldManagement = (eventNumber: string): FieldManagementSnapshot => {
  try {
    const saved = localStorage.getItem(
      `${FIELD_MANAGEMENT_KEY_PREFIX}:${eventNumber.trim() || "event"}`
    );
    if (!saved) return {};
    return JSON.parse(saved) as FieldManagementSnapshot;
  } catch {
    return {};
  }
};

export default function PlanningAid({
  event,
  players,
  onBack,
}: PlanningAidProps) {
  const storageKey = `${STORAGE_PREFIX}${event.eventNumber}`;

  const [clubAdvised, setClubAdvised] = useState(() =>
    readClubAdvised(event.eventNumber)
  );

  useEffect(() => {
    const refreshClubAdvised = () => setClubAdvised(readClubAdvised(event.eventNumber));
    refreshClubAdvised();
    window.addEventListener("focus", refreshClubAdvised);
    return () => window.removeEventListener("focus", refreshClubAdvised);
  }, [event.eventNumber]);


  const [fieldManagement, setFieldManagement] = useState<FieldManagementSnapshot>(() =>
    readFieldManagement(event.eventNumber)
  );

  useEffect(() => {
    const refreshFieldManagement = () =>
      setFieldManagement(readFieldManagement(event.eventNumber));
    refreshFieldManagement();
    window.addEventListener("focus", refreshFieldManagement);
    return () => window.removeEventListener("focus", refreshFieldManagement);
  }, [event.eventNumber]);


  const [settings, setSettings] = useState<PlanningAidSettings>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return defaultSettings;
      return { ...defaultSettings, ...JSON.parse(saved) };
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save Planning Aid settings", error);
    }
  }, [settings, storageKey]);

  const update = <K extends keyof PlanningAidSettings>(
    key: K,
    value: PlanningAidSettings[K]
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const choiceButton = (
    label: "Yes" | "No" | "Not applicable",
    selected: boolean,
    onClick: () => void
  ) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: "72px",
        border: selected ? "1px solid #2468b3" : "1px solid #cbd5e1",
        borderRadius: "9px",
        padding: "9px 16px",
        background: selected ? "#eaf4ff" : "white",
        color: selected ? "#205b9f" : "#475569",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  const questionRow = (
    label: string,
    value: boolean | null,
    onChange: (value: boolean) => void
  ) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "20px",
        alignItems: "center",
        padding: "16px 0",
        borderBottom: "1px solid #e5edf5",
      }}
    >
      <div style={{ color: "#334155", fontWeight: 650 }}>{label}</div>
      <div style={{ display: "flex", gap: "8px" }}>
        {choiceButton("Yes", value === true, () => onChange(true))}
        {choiceButton("No", value === false, () => onChange(false))}
      </div>
    </div>
  );

  const eventDetailsReady =
    Boolean(event.eventName?.trim()) &&
    Boolean(event.eventDate?.trim()) &&
    Boolean(event.venue?.trim());

  const competitionReady =
    Boolean(event.competitionCategory?.trim()) &&
    Boolean(event.competitionFormat?.trim()) &&
    Boolean(event.competition?.trim() || event.competitionRules?.trim());

  const setupAnswered =
    settings.promotionRequired !== null &&
    settings.cateringRequired !== null &&
    settings.minimumViableField !== null &&
    settings.drawRequired !== null &&
    settings.prizesRequired !== null;

  const parseEventDate = (value?: string) => {
    if (!value) return null;

    // Event Desk stores Event Date as DD/MM/YYYY.
    // Trim first so Planning Aid reads the same date even if whitespace
    // has accidentally been retained in the event record.
    const trimmedValue = value.trim();
    const ukMatch = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);

    if (ukMatch) {
      const [, dd, mm, yyyy] = ukMatch;
      const day = Number(dd);
      const month = Number(mm);
      const year = yyyy.length === 2 ? 2000 + Number(yyyy) : Number(yyyy);
      const parsed = new Date(year, month - 1, day);

      // Match the validation already used by Event Details.
      if (
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
      ) {
        return parsed;
      }

      return null;
    }

    // Retain ISO support for any older/test records.
    const isoMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (isoMatch) {
      const [, yyyy, mm, dd] = isoMatch;
      const year = Number(yyyy);
      const month = Number(mm);
      const day = Number(dd);
      const parsed = new Date(year, month - 1, day);

      if (
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
      ) {
        return parsed;
      }
    }

    return null;
  };

  const eventDate = parseEventDate(event.eventDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysUntilEvent =
    eventDate === null
      ? null
      : Math.round(
          (Date.UTC(
            eventDate.getFullYear(),
            eventDate.getMonth(),
            eventDate.getDate()
          ) -
            Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
            86400000
        );

  const promotionDeadline =
    eventDate === null
      ? null
      : new Date(
          eventDate.getFullYear(),
          eventDate.getMonth(),
          eventDate.getDate() - 28
        );

  const activationDate = settings.activatedDate
    ? new Date(`${settings.activatedDate}T00:00:00`)
    : null;

  const activationDaysUntilEvent = settings.activationDaysUntilEvent;

  const fastReactionPlayers =
    activationDaysUntilEvent !== null && activationDaysUntilEvent <= 14;

  const fastReactionCatering =
    settings.cateringRequired === true &&
    activationDaysUntilEvent !== null &&
    activationDaysUntilEvent <= 14;

  const fastReactionDraw =
    settings.drawRequired === true &&
    activationDaysUntilEvent !== null &&
    activationDaysUntilEvent <= 2;

  const fastReactionFieldSetup =
    activationDaysUntilEvent !== null && activationDaysUntilEvent <= 3;

  const fastReactionPromotion =
    settings.promotionRequired === true &&
    promotionDeadline !== null &&
    activationDate !== null &&
    activationDate > promotionDeadline;

  const promotionState: ReadinessState =
    settings.promotionRequired === false
      ? "grey"
      : settings.promotionRequired !== true || daysUntilEvent === null
      ? "grey"
      : settings.promotionIssued === true
      ? "green"
      : daysUntilEvent > 35
      ? "grey"
      : daysUntilEvent > 28
      ? "amber"
      : fastReactionPromotion
      ? "amber"
      : settings.promotionIssued === false
      ? "red"
      : "amber";

  const promotionDetail =
    settings.promotionRequired === false
      ? "Not required for this event."
      : settings.promotionRequired !== true
      ? "Planning choice not yet set."
      : daysUntilEvent === null
      ? "Event date required before promotion timing can be assessed."
      : settings.promotionIssued === true
      ? "Promotion confirmed as issued."
      : daysUntilEvent > 35
      ? `Promotion not yet due — preparation begins at 5 weeks.`
      : daysUntilEvent > 28
      ? "Promotion preparation is now due."
      : fastReactionPromotion
      ? "Fast Reaction — promotion needs action now."
      : settings.promotionIssued === false
      ? "Promotion overdue — issue promotion as soon as possible."
      : "Promotion issue deadline reached — confirmation required.";

  const confirmedPlayerCount = players.length;
  const minimumViableField = settings.minimumViableField;

  const playersState: ReadinessState =
    minimumViableField === null
      ? "grey"
      : confirmedPlayerCount >= minimumViableField
      ? "green"
      : daysUntilEvent !== null && daysUntilEvent <= 14
      ? fastReactionPlayers
        ? "amber"
        : "red"
      : "amber";

  const playersDetail =
    minimumViableField === null
      ? "Minimum viable field not yet set."
      : confirmedPlayerCount >= minimumViableField
      ? `${confirmedPlayerCount} confirmed — minimum viable field of ${minimumViableField} achieved.`
      : fastReactionPlayers && daysUntilEvent !== null && daysUntilEvent <= 14
      ? `Fast Reaction — ${confirmedPlayerCount} of ${minimumViableField} confirmed; ${
          minimumViableField - confirmedPlayerCount
        } still required. No historical penalty, but this needs action now.`
      : `${confirmedPlayerCount} of ${minimumViableField} confirmed — ${
          minimumViableField - confirmedPlayerCount
        } still required.`;

  const cateringState: ReadinessState =
    settings.cateringRequired === false
      ? "grey"
      : settings.cateringRequired !== true
      ? "grey"
      : clubAdvised
      ? "green"
      : daysUntilEvent !== null && daysUntilEvent <= 14
      ? fastReactionCatering
        ? "amber"
        : "red"
      : "amber";

  const cateringDetail =
    settings.cateringRequired === false
      ? "Not required for this event."
      : settings.cateringRequired !== true
      ? "Planning choice not yet set."
      : clubAdvised
      ? "Club Advised confirmed — final numbers and food requirements have been sent."
      : daysUntilEvent !== null && daysUntilEvent <= 14
      ? fastReactionCatering
        ? "Fast Reaction — catering advice was already due when Planning Aid was activated. No historical penalty, but final numbers and food requirements need action now."
        : "Catering deadline reached — final numbers and food requirements have not been marked as advised to the club."
      : "Catering required — Club Advised confirmation is due by 14 days.";

  const registeredPlayers = players.filter((player) => player.status === "Registered");
  const importedStartListCount = registeredPlayers.filter(
    (player) => Boolean(player.teeTime?.trim()) && Boolean(player.group?.trim())
  ).length;
  const hasImportedStartList =
    registeredPlayers.length > 0 && importedStartListCount === registeredPlayers.length;

  const proposedDrawCount = Array.isArray(fieldManagement.proposedDraw)
    ? fieldManagement.proposedDraw.length
    : 0;
  const confirmedDrawCount = Array.isArray(fieldManagement.confirmedDraw)
    ? fieldManagement.confirmedDraw.length
    : 0;

  const hasWorkableDraw =
    hasImportedStartList || proposedDrawCount > 0 || confirmedDrawCount > 0;
  const hasFinalDraw =
    hasImportedStartList ||
    fieldManagement.drawConfirmed === true ||
    confirmedDrawCount > 0;

  const drawState: ReadinessState =
    settings.drawRequired === false
      ? "grey"
      : settings.drawRequired !== true
      ? "grey"
      : hasFinalDraw
      ? "green"
      : daysUntilEvent !== null && daysUntilEvent <= 2
      ? fastReactionDraw
        ? "amber"
        : "red"
      : daysUntilEvent !== null && daysUntilEvent <= 7
      ? "amber"
      : hasWorkableDraw
      ? "green"
      : "grey";

  const drawDetail =
    settings.drawRequired === false
      ? "Not required for this event."
      : settings.drawRequired !== true
      ? "Planning choice not yet set."
      : hasImportedStartList
      ? `Start sheet ready — ${importedStartListCount} registered players have tee times and groups.`
      : hasFinalDraw
      ? "Final draw confirmed in Field Management."
      : daysUntilEvent !== null && daysUntilEvent <= 2
      ? fastReactionDraw
        ? "Fast Reaction — the final draw deadline had already been reached when Planning Aid was activated. No historical penalty, but a usable draw / start sheet is needed now."
        : "Final usable draw / start sheet is now required."
      : hasWorkableDraw
      ? "Workable draw exists in Field Management."
      : daysUntilEvent !== null && daysUntilEvent <= 7
      ? "A workable draw / start sheet is now due."
      : "Draw / start sheet required — no action expected yet.";

  const fieldManagementMilestoneReached =
    daysUntilEvent !== null && daysUntilEvent <= 3;

  const fieldManagementState: ReadinessState =
    !fieldManagementMilestoneReached
      ? "grey"
      : settings.fieldSetupReady === true
      ? "green"
      : fastReactionFieldSetup
      ? "amber"
      : "red";

  const fieldManagementDetail =
    !fieldManagementMilestoneReached
      ? "Event-day readiness check activates 3 days before the event."
      : settings.fieldSetupReady === true
      ? "Field / event-day setup confirmed as ready."
      : fastReactionFieldSetup
      ? "Fast Reaction — the event-day setup milestone had already been reached when Planning Aid was activated. No historical penalty, but readiness needs confirming now."
      : settings.fieldSetupReady === false
      ? "Field / event-day setup is not yet ready."
      : "Field / event-day setup confirmation is now required.";

  const financialsState: ReadinessState =
    settings.financialModelAgreed === true &&
    (settings.financialLiabilityAgreed === "yes" ||
      settings.financialLiabilityAgreed === "na")
      ? "green"
      : settings.financialModelAgreed === false ||
        settings.financialLiabilityAgreed === "no"
      ? "amber"
      : "grey";

  const financialsDetail =
    financialsState === "green"
      ? "Financial model and liability position agreed."
      : financialsState === "amber"
      ? "Financial arrangements still need agreement."
      : "Financial readiness confirmation not yet completed.";

  const bookletDecisionActive =
    daysUntilEvent !== null && daysUntilEvent <= 7 && daysUntilEvent >= 0;

  const bookletState: ReadinessState =
    !bookletDecisionActive
      ? "grey"
      : settings.produceBooklet === true
      ? "green"
      : "grey";

  const bookletDetail =
    !bookletDecisionActive
      ? "Optional enhancement — not currently expected."
      : settings.produceBooklet === true
      ? "Event booklet selected for this event."
      : settings.produceBooklet === false
      ? "No event booklet required."
      : "Optional final-week decision — produce an event booklet?";

  const recordedPrizeCount = (event.prizes ?? []).filter(
    (prize) => prize.title.trim() !== "" && prize.description.trim() !== ""
  ).length;

  const prizesFinalWeekActive =
    daysUntilEvent !== null && daysUntilEvent <= 7 && daysUntilEvent >= 0;

  const prizesState: ReadinessState =
    settings.prizesRequired === false
      ? "grey"
      : settings.prizesRequired !== true
      ? "grey"
      : recordedPrizeCount > 0
      ? "green"
      : prizesFinalWeekActive
      ? "amber"
      : "grey";

  const prizesDetail =
    settings.prizesRequired === false
      ? "Not required for this event."
      : settings.prizesRequired !== true
      ? "Planning choice not yet set."
      : recordedPrizeCount > 0
      ? `${recordedPrizeCount} prize${recordedPrizeCount === 1 ? "" : "s"} recorded.`
      : prizesFinalWeekActive
      ? "Prizes are required — none have been fully recorded yet."
      : "Required later — no action expected yet.";

  const recordedWinnerCount = (event.prizes ?? []).filter(
    (prize) => Boolean(prize.winner?.trim())
  ).length;
  const totalPrizeCount = (event.prizes ?? []).length;
  const eventHasFinished = daysUntilEvent !== null && daysUntilEvent < 0;
  const resultsOverdue = daysUntilEvent !== null && daysUntilEvent < -1;

  const resultsState: ReadinessState =
    !eventHasFinished
      ? "grey"
      : settings.resultsPublished === true
      ? "green"
      : resultsOverdue
      ? "red"
      : "amber";

  const resultsDetail =
    !eventHasFinished
      ? "Results communication becomes active after the event."
      : settings.resultsPublished === true
      ? `Results / winners confirmed as published${
          recordedWinnerCount > 0
            ? ` — ${recordedWinnerCount} winner${recordedWinnerCount === 1 ? "" : "s"} entered.`
            : "."
        }`
      : resultsOverdue
      ? `Results / winners publication is overdue${
          totalPrizeCount > 0
            ? ` — ${recordedWinnerCount} of ${totalPrizeCount} winners entered.`
            : "."
        }`
      : `Results / winners publication is now due${
          totalPrizeCount > 0
            ? ` — ${recordedWinnerCount} of ${totalPrizeCount} winners entered.`
            : "."
        }`;

  const paceMilestones: PaceMilestone[] = [
    {
      label: "Event details",
      weight: 1,
      dueDays: 56,
      achieved: eventDetailsReady,
      applicable: true,
    },
    {
      label: "Competition",
      weight: 1,
      dueDays: 28,
      achieved: competitionReady,
      applicable: true,
    },
    {
      label: "Financial model",
      weight: 1,
      dueDays: 28,
      achieved: financialsState === "green",
      applicable: true,
    },
    {
      label: "Promotion",
      weight: 2,
      dueDays: 28,
      achieved: settings.promotionIssued === true,
      applicable: settings.promotionRequired === true,
      fastReactionForgiven:
        fastReactionPromotion && settings.promotionIssued !== true,
    },
    {
      label: "Minimum player field",
      weight: 2,
      dueDays: 14,
      achieved:
        minimumViableField !== null &&
        confirmedPlayerCount >= minimumViableField,
      applicable: minimumViableField !== null,
      fastReactionForgiven:
        fastReactionPlayers &&
        minimumViableField !== null &&
        confirmedPlayerCount < minimumViableField,
    },
    {
      label: "Catering advised",
      weight: 2,
      dueDays: 14,
      achieved: clubAdvised,
      applicable: settings.cateringRequired === true,
      fastReactionForgiven:
        fastReactionCatering && !clubAdvised,
    },
    {
      label: "Workable draw",
      weight: 2,
      dueDays: 7,
      achieved: hasWorkableDraw || hasFinalDraw,
      applicable: settings.drawRequired === true,
      fastReactionForgiven:
        settings.drawRequired === true &&
        activationDaysUntilEvent !== null &&
        activationDaysUntilEvent <= 7 &&
        !(hasWorkableDraw || hasFinalDraw),
    },
    {
      label: "Event-day setup",
      weight: 2,
      dueDays: 3,
      achieved: settings.fieldSetupReady === true,
      applicable: true,
      fastReactionForgiven:
        fastReactionFieldSetup && settings.fieldSetupReady !== true,
    },
    {
      label: "Event delivered",
      weight: 3,
      dueDays: 0,
      achieved: eventHasFinished,
      applicable: true,
    },
    {
      label: "Results published",
      weight: 2,
      dueDays: -1,
      achieved: settings.resultsPublished === true,
      applicable: true,
    },
  ];

  const applicablePaceMilestones = paceMilestones.filter(
    (milestone) => milestone.applicable
  );

  const expectedPaceWeight = applicablePaceMilestones
    .filter(
      (milestone) =>
        daysUntilEvent !== null &&
        daysUntilEvent <= milestone.dueDays &&
        !milestone.fastReactionForgiven
    )
    .reduce((sum, milestone) => sum + milestone.weight, 0);

  const actualPaceWeight = applicablePaceMilestones
    .filter((milestone) => milestone.achieved)
    .reduce((sum, milestone) => sum + milestone.weight, 0);

  const paceGap = actualPaceWeight - expectedPaceWeight;

  const materiallyOverdueCritical =
    (playersState === "red" && daysUntilEvent !== null && daysUntilEvent <= 7) ||
    (cateringState === "red" && daysUntilEvent !== null && daysUntilEvent <= 7) ||
    drawState === "red" ||
    fieldManagementState === "red" ||
    resultsState === "red";

  const paceState: PaceState =
    materiallyOverdueCritical || paceGap <= -4
      ? "attention"
      : paceGap <= -2
      ? "slightly-behind"
      : paceGap >= 4
      ? "well-ahead"
      : paceGap >= 2
      ? "ahead"
      : "on-pace";

  const paceLabel: Record<PaceState, string> = {
    "well-ahead": "Well Ahead",
    ahead: "Ahead",
    "on-pace": "On Pace",
    "slightly-behind": "Slightly Behind",
    attention: "Attention Needed",
  };

  const paceColour: Record<PaceState, string> = {
    "well-ahead": "#166534",
    ahead: "#15803d",
    "on-pace": "#205b9f",
    "slightly-behind": "#92400e",
    attention: "#b91c1c",
  };

  const dueButIncomplete = applicablePaceMilestones.filter(
    (milestone) =>
      !milestone.achieved &&
      !milestone.fastReactionForgiven &&
      daysUntilEvent !== null &&
      daysUntilEvent <= milestone.dueDays
  );

  const achievedEarly = applicablePaceMilestones.filter(
    (milestone) =>
      milestone.achieved &&
      daysUntilEvent !== null &&
      daysUntilEvent > milestone.dueDays
  );

  const paceExplanation =
    paceState === "attention"
      ? dueButIncomplete.length > 0
        ? `Important preparation needs attention: ${dueButIncomplete
            .slice(0, 2)
            .map((milestone) => milestone.label)
            .join(" and ")}.`
        : "An important operational milestone needs attention."
      : paceState === "slightly-behind"
      ? dueButIncomplete.length > 0
        ? `Most preparation is progressing, but ${dueButIncomplete[0].label.toLowerCase()} still needs attention.`
        : "Preparation is a little behind the expected position but remains recoverable."
      : paceState === "well-ahead"
      ? achievedEarly.length > 0
        ? `Several meaningful milestones are already complete ahead of schedule, including ${achievedEarly[0].label.toLowerCase()}.`
        : "Preparation is substantially ahead of the expected position."
      : paceState === "ahead"
      ? achievedEarly.length > 0
        ? `Preparation is comfortably ahead, with ${achievedEarly[0].label.toLowerCase()} already complete.`
        : "Preparation is comfortably ahead of the expected position."
      : "Preparation is broadly where it should be for this stage of the event.";

  const readinessItems: ReadinessItem[] = [
    {
      label: "Event Details",
      state: eventDetailsReady ? "green" : "amber",
      detail: eventDetailsReady
        ? "Core event information is in place."
        : "Core event information still needs attention.",
    },
    {
      label: "Competition",
      state: competitionReady ? "green" : "amber",
      detail: competitionReady
        ? "Competition information is established."
        : "Competition information is not yet established.",
    },
    {
      label: "Promotion",
      state: promotionState,
      detail: promotionDetail,
    },
    {
      label: "Players",
      state: playersState,
      detail: playersDetail,
    },
    {
      label: "Catering",
      state: cateringState,
      detail: cateringDetail,
    },
    {
      label: "Field & Draw",
      state: drawState,
      detail: drawDetail,
    },
    {
      label: "Field Management",
      state: fieldManagementState,
      detail: fieldManagementDetail,
    },
    {
      label: "Financials",
      state: financialsState,
      detail: financialsDetail,
    },
    {
      label: "Booklets",
      state: bookletState,
      detail: bookletDetail,
    },
    {
      label: "Prizes",
      state: prizesState,
      detail: prizesDetail,
    },
    {
      label: "Results",
      state: resultsState,
      detail: resultsDetail,
    },
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "34px 42px 48px",
        boxSizing: "border-box",
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          border: "1px solid #2f6db5",
          borderRadius: "9px",
          padding: "9px 14px",
          background: "white",
          color: "#205b9f",
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: "22px",
        }}
      >
        <ArrowLeft size={18} />
        Back to Event Details
      </button>

      <div style={{ marginBottom: "26px" }}>
        <h1 style={{ margin: 0, color: "#205b9f", fontSize: "34px" }}>
          Event Planning Aid
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            color: "#64748b",
            fontSize: "17px",
          }}
        >
          Event {event.eventNumber} — {event.eventName || "Untitled Event"}
        </p>
      </div>

      <div
        style={{
          border: "1px solid #dbe7f3",
          borderRadius: "14px",
          background: "white",
          padding: "24px",
          boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div>
            <h2
              style={{
                margin: "0 0 6px",
                color: "#1e4f89",
                fontSize: "22px",
              }}
            >
              Planning Aid
            </h2>
            <p style={{ margin: 0, color: "#64748b" }}>
              Use Event Readiness &amp; Pace for this event?
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {choiceButton("Yes", settings.enabled, () => {
              setSettings((current) => ({
                ...current,
                enabled: true,
                activatedDate: current.enabled
                  ? current.activatedDate
                  : new Date().toISOString().slice(0, 10),
                activationDaysUntilEvent: current.enabled
                  ? current.activationDaysUntilEvent
                  : daysUntilEvent,
              }));
            })}
            {choiceButton("No", !settings.enabled, () => {
              setSettings((current) => ({
                ...current,
                enabled: false,
                activatedDate: null,
                activationDaysUntilEvent: null,
              }));
            })}
          </div>
        </div>
      </div>

      {settings.enabled ? (
        <div
          style={{
            border: "1px solid #dbe7f3",
            borderRadius: "14px",
            background: "white",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
          }}
        >
          <h2
            style={{
              margin: "0 0 4px",
              color: "#1e4f89",
              fontSize: "22px",
            }}
          >
            Event Planning Setup
          </h2>
          <p style={{ margin: "0 0 8px", color: "#64748b" }}>
            These settings apply only to this event.
          </p>

          {questionRow(
            "Promotion required?",
            settings.promotionRequired,
            (value) => update("promotionRequired", value)
          )}

          {questionRow(
            "Catering commitment required?",
            settings.cateringRequired,
            (value) => update("cateringRequired", value)
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "20px",
              alignItems: "center",
              padding: "16px 0",
              borderBottom: "1px solid #e5edf5",
            }}
          >
            <div>
              <div style={{ color: "#334155", fontWeight: 650 }}>
                Minimum viable field
              </div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                  marginTop: "4px",
                }}
              >
                Minimum confirmed players needed for the event to be viable.
              </div>
            </div>

            <input
              type="number"
              min="1"
              value={settings.minimumViableField ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                update(
                  "minimumViableField",
                  value === "" ? null : Math.max(1, Number(value))
                );
              }}
              style={{
                width: "110px",
                border: "1px solid #cbd5e1",
                borderRadius: "9px",
                padding: "10px 12px",
                fontSize: "16px",
                color: "#334155",
                boxSizing: "border-box",
              }}
            />
          </div>

          {questionRow(
            "Draw / start sheet required?",
            settings.drawRequired,
            (value) => update("drawRequired", value)
          )}

          {questionRow(
            "Prizes required?",
            settings.prizesRequired,
            (value) => update("prizesRequired", value)
          )}

          {settings.promotionRequired === true &&
            daysUntilEvent !== null &&
            daysUntilEvent <= 28 && (
              <div
                style={{
                  marginTop: "18px",
                  border: fastReactionPromotion
                    ? "1px solid #fde68a"
                    : "1px solid #dbe7f3",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  background: fastReactionPromotion ? "#fffbeb" : "#f8fbff",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "20px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ color: "#334155", fontWeight: 700 }}>
                      Promotion issued?
                    </div>
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "14px",
                        marginTop: "4px",
                      }}
                    >
                      {fastReactionPromotion
                        ? "Fast Reaction event — no historical penalty. Confirm once promotion has been issued."
                        : "The 4-week promotion milestone has been reached."}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {choiceButton(
                      "Yes",
                      settings.promotionIssued === true,
                      () => update("promotionIssued", true)
                    )}
                    {choiceButton(
                      "No",
                      settings.promotionIssued === false,
                      () => update("promotionIssued", false)
                    )}
                  </div>
                </div>
              </div>
            )}

            {fieldManagementMilestoneReached && (
              <div
                style={{
                  marginTop: "16px",
                  border: "1px solid #dbe7f3",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  background: "#f8fbff",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "20px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ color: "#334155", fontWeight: 700 }}>
                      Is the field/event-day setup ready?
                    </div>
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "14px",
                        marginTop: "4px",
                      }}
                    >
                      The 3-day event-day readiness milestone has been reached.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {choiceButton(
                      "Yes",
                      settings.fieldSetupReady === true,
                      () => update("fieldSetupReady", true)
                    )}
                    {choiceButton(
                      "No",
                      settings.fieldSetupReady === false,
                      () => update("fieldSetupReady", false)
                    )}
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: "16px",
                border: "1px solid #dbe7f3",
                borderRadius: "12px",
                padding: "16px 18px",
                background: "#f8fbff",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "20px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ color: "#334155", fontWeight: 700 }}>
                    Financial model agreed?
                  </div>
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "14px",
                      marginTop: "4px",
                    }}
                  >
                    Confirm the planned income, costs, funding and commitments are understood.
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {choiceButton(
                    "Yes",
                    settings.financialModelAgreed === true,
                    () => update("financialModelAgreed", true)
                  )}
                  {choiceButton(
                    "No",
                    settings.financialModelAgreed === false,
                    () => update("financialModelAgreed", false)
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "20px",
                  alignItems: "center",
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <div style={{ color: "#334155", fontWeight: 700 }}>
                    Financial liability agreed?
                  </div>
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "14px",
                      marginTop: "4px",
                    }}
                  >
                    Confirm any event financial liability has been agreed, or mark it not applicable.
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {choiceButton(
                    "Yes",
                    settings.financialLiabilityAgreed === "yes",
                    () => update("financialLiabilityAgreed", "yes")
                  )}
                  {choiceButton(
                    "No",
                    settings.financialLiabilityAgreed === "no",
                    () => update("financialLiabilityAgreed", "no")
                  )}
                  {choiceButton(
                    "Not applicable",
                    settings.financialLiabilityAgreed === "na",
                    () => update("financialLiabilityAgreed", "na")
                  )}
                </div>
              </div>
            </div>

            {eventHasFinished && (
              <div
                style={{
                  marginTop: "16px",
                  border: "1px solid #dbe7f3",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  background: "#f8fbff",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "20px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ color: "#334155", fontWeight: 700 }}>
                      Results/winners published?
                    </div>
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "14px",
                        marginTop: "4px",
                      }}
                    >
                      {totalPrizeCount > 0
                        ? `${recordedWinnerCount} of ${totalPrizeCount} winners entered. Confirm once the results have been communicated.`
                        : "Confirm once the event results have been communicated."}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {choiceButton(
                      "Yes",
                      settings.resultsPublished === true,
                      () => update("resultsPublished", true)
                    )}
                    {choiceButton(
                      "No",
                      settings.resultsPublished === false,
                      () => update("resultsPublished", false)
                    )}
                  </div>
                </div>
              </div>
            )}

            {bookletDecisionActive && (
              <div
                style={{
                  marginTop: "16px",
                  border: "1px solid #dbe7f3",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  background: "#f8fbff",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "20px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ color: "#334155", fontWeight: 700 }}>
                      Produce event booklet?
                    </div>
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "14px",
                        marginTop: "4px",
                      }}
                    >
                      Optional final-week enhancement — either answer is acceptable.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {choiceButton(
                      "Yes",
                      settings.produceBooklet === true,
                      () => update("produceBooklet", true)
                    )}
                    {choiceButton(
                      "No",
                      settings.produceBooklet === false,
                      () => update("produceBooklet", false)
                    )}
                  </div>
                </div>
              </div>
            )}

          <div
            style={{
              marginTop: "28px",
              paddingTop: "24px",
              borderTop: "2px solid #e5edf5",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "20px",
                marginBottom: "18px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: "0 0 5px",
                    color: "#1e4f89",
                    fontSize: "22px",
                  }}
                >
                  Event Readiness
                </h2>
                <p style={{ margin: 0, color: "#64748b" }}>
                  Live readiness view — milestone timing updates as the event approaches.
                </p>
              </div>

              <span
                style={{
                  borderRadius: "999px",
                  padding: "8px 12px",
                  background: setupAnswered ? "#ecfdf3" : "#fff7ed",
                  color: setupAnswered ? "#15803d" : "#c2410c",
                  fontWeight: 700,
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                }}
              >
                {setupAnswered ? "Setup Complete" : "Setup Incomplete"}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "12px",
              }}
            >
              {readinessItems.map((item) => {
                const colours = readinessColours[item.state];

                return (
                  <div
                    key={item.label}
                    style={{
                      border: `1px solid ${colours.border}`,
                      borderRadius: "11px",
                      padding: "14px 16px",
                      background: colours.background,
                      minHeight: "76px",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "9px",
                        marginBottom: "5px",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: colours.dot,
                          flex: "0 0 auto",
                        }}
                      />
                      <strong style={{ color: colours.text }}>
                        {item.label}
                      </strong>
                    </div>

                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "14px",
                        lineHeight: 1.35,
                      }}
                    >
                      {item.detail}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: "18px",
                border: "1px solid #dbe7f3",
                borderRadius: "12px",
                padding: "18px",
                background: "#f8fbff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <Gauge size={26} color="#2f80d0" />
                <div>
                  <strong style={{ color: "#205b9f" }}>Event Pace</strong>
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "14px",
                      marginTop: "3px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: paceColour[paceState],
                      }}
                    >
                      {paceLabel[paceState]}
                    </span>
                    {" — "}
                    {paceExplanation}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            border: "1px solid #dbe7f3",
            borderRadius: "14px",
            background: "white",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
          }}
        >
          <h2
            style={{
              margin: "0 0 8px",
              color: "#1e4f89",
              fontSize: "22px",
            }}
          >
            Planning Aid is currently Off
          </h2>

          <p
            style={{
              margin: "0 0 24px",
              color: "#64748b",
              lineHeight: 1.55,
            }}
          >
            Event Readiness and Event Pace are optional for this event.
            Turn Planning Aid on when you want to use them.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "18px",
            }}
          >
            <div
              style={{
                border: "1px solid #dbe7f3",
                borderRadius: "12px",
                padding: "22px",
                background: "#f8fbff",
              }}
            >
              <PieChart size={30} color="#2f80d0" />
              <h3 style={{ margin: "12px 0 6px", color: "#205b9f" }}>
                Event Readiness
              </h3>
              <p style={{ margin: 0, color: "#64748b" }}>
                Available when Planning Aid is switched on.
              </p>
            </div>

            <div
              style={{
                border: "1px solid #dbe7f3",
                borderRadius: "12px",
                padding: "22px",
                background: "#f8fbff",
              }}
            >
              <Gauge size={30} color="#2f80d0" />
              <h3 style={{ margin: "12px 0 6px", color: "#205b9f" }}>
                Event Pace
              </h3>
              <p style={{ margin: 0, color: "#64748b" }}>
                Available when Planning Aid is switched on.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
