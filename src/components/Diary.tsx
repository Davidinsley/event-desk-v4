import { useEffect, useState } from "react";
import type { Event } from "../types/Event";
import type { Player } from "../types/Player";

export interface DiaryEventRecord {
  id: string;
  event: Event;
  archived?: boolean;
  players?: Player[];
}

interface DiaryProps {
  eventRecords: DiaryEventRecord[];
  onBack: () => void;
  onOpenSource: (
    recordId: string,
    page: "new" | "planningAid" | "checklist" | "players" | "catering" | "field"
  ) => void;
}

type DiaryView =
  | "quick"
  | "events"
  | "planning"
  | "milestones"
  | "todos"
  | "full"
  | "history";

const parseEventDate = (value: string): Date | null => {
  const raw = value?.trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);

    if (match[3].length === 2) {
      year += year >= 70 ? 1900 : 2000;
    }

    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }

    return null;
  }

  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);


interface PlanningAidSnapshot {
  enabled?: boolean;
  promotionRequired?: boolean | null;
  cateringRequired?: boolean | null;
  minimumViableField?: number | null;
  drawRequired?: boolean | null;
  activatedDate?: string | null;
  activationDaysUntilEvent?: number | null;
  promotionIssued?: boolean | null;
  fieldSetupReady?: boolean | null;
  resultsPublished?: boolean | null;
}

interface FieldManagementSnapshot {
  proposedDraw?: unknown[];
  confirmedDraw?: unknown[];
  drawConfirmed?: boolean;
}

interface ManualDiaryEntry {
  id: string;
  date: string;
  title: string;
  notes: string;
}

const CHECKLIST_PREFIX = "eventDeskChecklistV1:";

interface DiaryChecklistTask {
  id?: string;
  text?: string;
  status?: "todo" | "complete";
  category?: string;
  dueDate?: string;
  assignedTo?: string;
}

interface DiaryToDoItem {
  key: string;
  recordId: string;
  date: Date;
  eventName: string;
  text: string;
  category: string;
  assignedTo?: string;
}

interface DiaryHistoryItem {
  key: string;
  date: Date;
  title: string;
  detail?: string;
  kind: "Event" | "Diary" | "Completed To Do";
}

const parseChecklistDueDate = (value?: string): Date | null => {
  const raw = value?.trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }
    return null;
  }

  return parseEventDate(raw);
};

const getDiaryToDoItems = (eventRecords: DiaryEventRecord[]): DiaryToDoItem[] =>
  eventRecords
    .filter((record) => !record.archived)
    .flatMap((record) => {
      const eventDate = parseEventDate(record.event.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Past events are history, not current work.
      if (!eventDate || eventDate < today) return [];

      try {
        const saved = localStorage.getItem(
          `${CHECKLIST_PREFIX}${record.event.eventNumber}`
        );
        const tasks: DiaryChecklistTask[] = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(tasks)) return [];

        return tasks.flatMap((task, index) => {
          if (task.status === "complete") return [];

          const dueDate = parseChecklistDueDate(task.dueDate);
          const taskText = task.text?.trim();
          if (!dueDate || !taskText) return [];

          return [{
            key: `todo-${record.id}-${task.id ?? index}`,
            recordId: record.id,
            date: dueDate,
            eventName: record.event.eventName || "Untitled Event",
            text: taskText,
            category: task.category?.trim() || "General",
            assignedTo: task.assignedTo?.trim() || undefined,
          }];
        });
      } catch {
        return [];
      }
    })
    .sort((a, b) => {
      const dateDifference = a.date.getTime() - b.date.getTime();
      if (dateDifference !== 0) return dateDifference;
      const eventDifference = a.eventName.localeCompare(b.eventName);
      if (eventDifference !== 0) return eventDifference;
      return a.text.localeCompare(b.text);
    });

const getCompletedToDoHistoryItems = (
  eventRecords: DiaryEventRecord[]
): DiaryHistoryItem[] =>
  eventRecords.flatMap((record) => {
    try {
      const saved = localStorage.getItem(
        `${CHECKLIST_PREFIX}${record.event.eventNumber}`
      );
      const tasks: DiaryChecklistTask[] = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(tasks)) return [];

      return tasks.flatMap((task, index) => {
        if (task.status !== "complete") return [];

        const dueDate = parseChecklistDueDate(task.dueDate);
        const taskText = task.text?.trim();
        if (!dueDate || !taskText) return [];

        return [{
          key: `history-todo-${record.id}-${task.id ?? index}`,
          date: dueDate,
          title: `${record.event.eventName || "Untitled Event"} — ${taskText}`,
          detail: [
            task.category?.trim() || "General",
            task.assignedTo?.trim(),
          ].filter(Boolean).join(" • "),
          kind: "Completed To Do" as const,
        }];
      });
    } catch {
      return [];
    }
  });

const MANUAL_DIARY_KEY = "eventDeskManualDiaryV1";

const loadManualDiaryEntries = (): ManualDiaryEntry[] => {
  try {
    const saved = localStorage.getItem(MANUAL_DIARY_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

interface RedNotice {
  key: string;
  recordId: string;
  eventName: string;
  label: string;
  detail: string;
}

const PLANNING_AID_PREFIX = "eventDeskPlanningAidV1:";
const CATERING_PREFIX = "eventDeskCateringV1:";
const FIELD_MANAGEMENT_PREFIX = "event-desk-field-management-draw-v4";

const readJson = <T,>(key: string): T | null => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : null;
  } catch {
    return null;
  }
};

const calendarDaysUntil = (eventDate: Date, today: Date) =>
  Math.round(
    (Date.UTC(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    ) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000
  );

const getPlanningAidRedNotices = (
  record: DiaryEventRecord,
  today: Date
): RedNotice[] => {
  const event = record.event;
  const eventNumber = event.eventNumber?.trim();
  if (!eventNumber) return [];

  const settings = readJson<PlanningAidSnapshot>(
    `${PLANNING_AID_PREFIX}${eventNumber}`
  );

  if (!settings?.enabled) return [];

  const eventDate = parseEventDate(event.eventDate);
  if (!eventDate) return [];

  const daysUntilEvent = calendarDaysUntil(eventDate, today);

  // Diary is forward-looking: past events do not generate Immediate Action.
  if (daysUntilEvent < 0) return [];

  const activationDaysUntilEvent = settings.activationDaysUntilEvent;

  const fastReactionPlayers =
    activationDaysUntilEvent !== null &&
    activationDaysUntilEvent !== undefined &&
    activationDaysUntilEvent <= 14;

  const fastReactionCatering =
    settings.cateringRequired === true &&
    activationDaysUntilEvent !== null &&
    activationDaysUntilEvent !== undefined &&
    activationDaysUntilEvent <= 14;

  const fastReactionDraw =
    settings.drawRequired === true &&
    activationDaysUntilEvent !== null &&
    activationDaysUntilEvent !== undefined &&
    activationDaysUntilEvent <= 2;

  const fastReactionFieldSetup =
    activationDaysUntilEvent !== null &&
    activationDaysUntilEvent !== undefined &&
    activationDaysUntilEvent <= 3;

  const promotionDeadline = new Date(
    eventDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate() - 28
  );

  const activationDate = settings.activatedDate
    ? new Date(`${settings.activatedDate}T00:00:00`)
    : null;

  const fastReactionPromotion =
    settings.promotionRequired === true &&
    activationDate !== null &&
    activationDate > promotionDeadline;

  const notices: RedNotice[] = [];
  const eventName = event.eventName || "Untitled Event";

  if (
    settings.promotionRequired === true &&
    settings.promotionIssued === false &&
    daysUntilEvent <= 28 &&
    !fastReactionPromotion
  ) {
    notices.push({
      key: `${record.id}-promotion`,
      recordId: record.id,
      eventName,
      label: "Promotion",
      detail: "Promotion is overdue and needs to be issued.",
    });
  }

  const minimumViableField = settings.minimumViableField;
  const confirmedPlayerCount = record.players?.length ?? 0;

  if (
    minimumViableField !== null &&
    minimumViableField !== undefined &&
    confirmedPlayerCount < minimumViableField &&
    daysUntilEvent <= 14 &&
    !fastReactionPlayers
  ) {
    notices.push({
      key: `${record.id}-players`,
      recordId: record.id,
      eventName,
      label: "Players",
      detail: `${confirmedPlayerCount} of ${minimumViableField} confirmed — minimum viable field has not been reached.`,
    });
  }

  if (
    settings.cateringRequired === true &&
    daysUntilEvent <= 14 &&
    !fastReactionCatering
  ) {
    const catering = readJson<{ clubAdvised?: boolean }>(
      `${CATERING_PREFIX}${record.id}`
    );

    if (catering?.clubAdvised !== true) {
      notices.push({
        key: `${record.id}-catering`,
        recordId: record.id,
        eventName,
        label: "Catering",
        detail: "Catering deadline reached — the club has not been marked as advised.",
      });
    }
  }

  if (
    settings.drawRequired === true &&
    daysUntilEvent <= 2 &&
    !fastReactionDraw
  ) {
    const fieldManagement =
      readJson<FieldManagementSnapshot>(
        `${FIELD_MANAGEMENT_PREFIX}:${eventNumber || "event"}`
      ) ?? {};

    const confirmedDrawCount = Array.isArray(fieldManagement.confirmedDraw)
      ? fieldManagement.confirmedDraw.length
      : 0;

    const registeredPlayers = (record.players ?? []).filter(
      (player) => player.status === "Registered"
    );

    const hasImportedStartList =
      registeredPlayers.length > 0 &&
      registeredPlayers.every(
        (player) => Boolean(player.teeTime?.trim()) && Boolean(player.group?.trim())
      );

    const hasFinalDraw =
      hasImportedStartList ||
      fieldManagement.drawConfirmed === true ||
      confirmedDrawCount > 0;

    if (!hasFinalDraw) {
      notices.push({
        key: `${record.id}-draw`,
        recordId: record.id,
        eventName,
        label: "Field & Draw",
        detail: "Final usable draw / start sheet is now required.",
      });
    }
  }

  if (
    daysUntilEvent <= 3 &&
    settings.fieldSetupReady !== true &&
    !fastReactionFieldSetup
  ) {
    notices.push({
      key: `${record.id}-field-setup`,
      recordId: record.id,
      eventName,
      label: "Field Management",
      detail: "Field / event-day setup readiness now needs confirmation.",
    });
  }

  return notices;
};


interface PlanningDiaryItem {
  key: string;
  recordId: string;
  date: Date;
  eventName: string;
  label: string;
  detail: string;
  kind: "Commencement" | "Target";
}

const addCalendarDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const getPlanningDiaryItems = (
  record: DiaryEventRecord,
  today: Date
): PlanningDiaryItem[] => {
  const event = record.event;
  const eventNumber = event.eventNumber?.trim();
  if (!eventNumber) return [];

  const settings = readJson<PlanningAidSnapshot>(
    `${PLANNING_AID_PREFIX}${eventNumber}`
  );
  if (!settings?.enabled) return [];

  const eventDate = parseEventDate(event.eventDate);
  if (!eventDate) return [];

  const eventName = event.eventName || "Untitled Event";
  const items: PlanningDiaryItem[] = [];

  const addItem = (
    suffix: string,
    daysBeforeEvent: number,
    label: string,
    detail: string,
    kind: "Commencement" | "Target" = "Target"
  ) => {
    const date = addCalendarDays(eventDate, -daysBeforeEvent);
    if (date >= today) {
      items.push({
        key: `${record.id}-${suffix}`,
        recordId: record.id,
        date,
        eventName,
        label,
        detail,
        kind,
      });
    }
  };

  // These dates mirror the timetable already used by Event Planning Aid.
  addItem(
    "event-details-start",
    56,
    "Event details",
    "Core event information should be established.",
    "Commencement"
  );
  addItem(
    "competition",
    28,
    "Competition",
    "Competition format and rules should be established."
  );
  addItem(
    "financial-model",
    28,
    "Financial model",
    "Planned income, costs, funding and commitments should be agreed."
  );

  if (settings.promotionRequired === true) {
    addItem(
      "promotion-start",
      35,
      "Promotion preparation",
      "Begin preparing event promotion.",
      "Commencement"
    );
    addItem(
      "promotion",
      28,
      "Promotion issued",
      "Promotion should be issued by this date."
    );
  }

  if (
    settings.minimumViableField !== null &&
    settings.minimumViableField !== undefined
  ) {
    addItem(
      "minimum-field",
      14,
      "Minimum player field",
      `Minimum viable field of ${settings.minimumViableField} players should be achieved.`
    );
  }

  if (settings.cateringRequired === true) {
    addItem(
      "catering",
      14,
      "Catering commitment",
      "Final numbers and food requirements should be advised to the club."
    );
  }

  if (settings.drawRequired === true) {
    addItem(
      "workable-draw",
      7,
      "Workable draw",
      "A workable draw / start sheet should be in place."
    );
    addItem(
      "final-draw",
      2,
      "Final draw",
      "Final usable draw / start sheet should be ready."
    );
  }

  addItem(
    "event-day-setup",
    3,
    "Event-day setup",
    "Field / event-day setup readiness should be confirmed."
  );

  items.push({
    key: `${record.id}-event-day`,
    recordId: record.id,
    date: eventDate,
    eventName,
    label: "Event day",
    detail: "Event delivery.",
    kind: "Target",
  });

  const resultsDate = addCalendarDays(eventDate, 1);
  if (resultsDate >= today) {
    items.push({
      key: `${record.id}-results`,
      recordId: record.id,
      date: resultsDate,
      eventName,
      label: "Results published",
      detail: "Results / winners communication should be completed.",
      kind: "Target",
    });
  }

  return items;
};

export default function Diary({
  eventRecords,
  onBack,
  onOpenSource,
}: DiaryProps) {
  const [view, setView] = useState<DiaryView>("quick");
  const [manualEntries, setManualEntries] = useState<ManualDiaryEntry[]>(
    loadManualDiaryEntries
  );
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(MANUAL_DIARY_KEY, JSON.stringify(manualEntries));
    } catch {
      // Keep Diary usable even if browser storage is unavailable.
    }
  }, [manualEntries]);

  const saveManualEntry = () => {
    const title = manualTitle.trim();
    if (!manualDate || !title) return;

    setManualEntries((entries) => [
      ...entries,
      {
        id: `diary-${Date.now()}`,
        date: manualDate,
        title,
        notes: manualNotes.trim(),
      },
    ]);

    setManualDate("");
    setManualTitle("");
    setManualNotes("");
    setShowAddEntry(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const redNotices = eventRecords
    .filter((record) => !record.archived)
    .flatMap((record) => getPlanningAidRedNotices(record, today));

  const startEditingEntry = (entry: ManualDiaryEntry) => {
    setEditingEntryId(entry.id);
    setEditDate(entry.date);
    setEditTitle(entry.title);
    setEditNotes(entry.notes);
  };

  const cancelEditingEntry = () => {
    setEditingEntryId(null);
    setEditDate("");
    setEditTitle("");
    setEditNotes("");
  };

  const saveEditedEntry = () => {
    const title = editTitle.trim();
    if (!editingEntryId || !editDate || !title) return;

    setManualEntries((entries) =>
      entries.map((entry) =>
        entry.id === editingEntryId
          ? {
              ...entry,
              date: editDate,
              title,
              notes: editNotes.trim(),
            }
          : entry
      )
    );
    cancelEditingEntry();
  };

  const deleteManualEntry = (entry: ManualDiaryEntry) => {
    if (!window.confirm(`Delete diary entry "${entry.title}"?`)) return;
    setManualEntries((entries) =>
      entries.filter((item) => item.id !== entry.id)
    );
    if (editingEntryId === entry.id) cancelEditingEntry();
  };

  const upcomingManualEntries = manualEntries
    .map((entry) => ({
      entry,
      date: parseEventDate(entry.date),
    }))
    .filter(
      (
        item
      ): item is {
        entry: ManualDiaryEntry;
        date: Date;
      } => item.date !== null && item.date >= today
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const upcomingEvents = eventRecords
    .filter((record) => !record.archived)
    .map((record) => ({
      record,
      date: parseEventDate(record.event.eventDate),
    }))
    .filter(
      (
        item
      ): item is {
        record: DiaryEventRecord;
        date: Date;
      } => item.date !== null && item.date >= today
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const planningDiaryItems = eventRecords
    .filter((record) => !record.archived)
    .flatMap((record) => getPlanningDiaryItems(record, today))
    .sort((a, b) => {
      const dateDifference = a.date.getTime() - b.date.getTime();
      if (dateDifference !== 0) return dateDifference;
      const eventDifference = a.eventName.localeCompare(b.eventName);
      if (eventDifference !== 0) return eventDifference;
      return a.label.localeCompare(b.label);
    });

  const diaryToDoItems = getDiaryToDoItems(eventRecords);

  const historyItems: DiaryHistoryItem[] = [
    ...eventRecords
      .map((record) => ({
        record,
        date: parseEventDate(record.event.eventDate),
      }))
      .filter(
        (
          item
        ): item is {
          record: DiaryEventRecord;
          date: Date;
        } =>
          item.date !== null &&
          (item.date < today || item.record.archived === true)
      )
      .map(({ record, date }) => ({
        key: `history-event-${record.id}`,
        date,
        title: record.event.eventName || "Untitled Event",
        detail: record.archived ? "Archived event" : "Past event",
        kind: "Event" as const,
      })),
    ...manualEntries
      .map((entry) => ({
        entry,
        date: parseEventDate(entry.date),
      }))
      .filter(
        (
          item
        ): item is {
          entry: ManualDiaryEntry;
          date: Date;
        } => item.date !== null && item.date < today
      )
      .map(({ entry, date }) => ({
        key: `history-manual-${entry.id}`,
        date,
        title: entry.title,
        detail: entry.notes || undefined,
        kind: "Diary" as const,
      })),
    ...getCompletedToDoHistoryItems(eventRecords),
  ].sort((a, b) => {
    const dateDifference = b.date.getTime() - a.date.getTime();
    if (dateDifference !== 0) return dateDifference;
    return a.title.localeCompare(b.title);
  });

  const openRedNoticeSource = (notice: RedNotice) => {
    if (notice.label === "Players") {
      onOpenSource(notice.recordId, "players");
      return;
    }

    if (notice.label === "Catering") {
      onOpenSource(notice.recordId, "catering");
      return;
    }

    if (
      notice.label === "Field & Draw" ||
      notice.label === "Field Management"
    ) {
      onOpenSource(notice.recordId, "field");
      return;
    }

    onOpenSource(notice.recordId, "planningAid");
  };

  type FullDiaryItem =
    | { key: string; date: Date; kind: "event"; title: string; notes: string; recordId: string }
    | { key: string; date: Date; kind: "manual"; title: string; notes: string }
    | { key: string; date: Date; kind: "planning"; title: string; notes: string; recordId: string; planningKind: "Commencement" | "Target" }
    | { key: string; date: Date; kind: "todo"; title: string; notes: string; recordId: string };

  const fullDiaryItems: FullDiaryItem[] = [
    ...upcomingEvents.map(({ record, date }) => ({
      key: `event-${record.id}`, date, kind: "event" as const,
      title: record.event.eventName || "Untitled Event", notes: "", recordId: record.id,
    })),
    ...upcomingManualEntries.map(({ entry, date }) => ({
      key: `manual-${entry.id}`, date, kind: "manual" as const,
      title: entry.title, notes: entry.notes,
    })),
    ...planningDiaryItems.map((item) => ({
      key: `planning-${item.key}`, date: item.date, kind: "planning" as const,
      title: `${item.eventName} — ${item.label}`, notes: item.detail,
      recordId: item.recordId, planningKind: item.kind,
    })),
    ...diaryToDoItems.map((item) => ({
      key: `full-${item.key}`, date: item.date, kind: "todo" as const,
      title: `${item.eventName} — ${item.text}`,
      notes: [item.category, item.assignedTo].filter(Boolean).join(" • "),
      recordId: item.recordId,
    })),
  ].sort((a, b) => {
    const dateDifference = a.date.getTime() - b.date.getTime();
    if (dateDifference !== 0) return dateDifference;
    return a.title.localeCompare(b.title);
  });

  const openFullDiarySource = (item: FullDiaryItem) => {
    if (item.kind === "event") return onOpenSource(item.recordId, "new");
    if (item.kind === "planning") return onOpenSource(item.recordId, "planningAid");
    if (item.kind === "todo") return onOpenSource(item.recordId, "checklist");
  };

  const fullDiaryLabel = (item: FullDiaryItem) => {
    if (item.kind === "event") return "Event";
    if (item.kind === "manual") return "Diary";
    if (item.kind === "todo") return "To Do";
    return item.planningKind;
  };

  return (
    <section
      style={{
        width: "100%",
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "36px 42px 48px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "24px",
          marginBottom: "30px",
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
            Diary
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: "18px",
            }}
          >
            A quick view of upcoming Ramsdale Seniors events and actions.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#475569",
              fontWeight: 700,
            }}
          >
            View
            <select
              value={view}
              onChange={(event) => setView(event.target.value as DiaryView)}
              aria-label="Diary view"
              style={{
                border: "1px solid #b8cce2",
                borderRadius: "9px",
                padding: "10px 34px 10px 12px",
                background: "#f8fafc",
                color: "#334155",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              <option value="quick">Quick View</option>
              <option value="events">Events Only</option>
              <option value="planning">Planning</option>
              <option value="milestones">Milestones</option>
              <option value="todos">To Dos</option>
              <option value="full">Full Diary</option>
              <option value="history">History</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => setShowAddEntry((open) => !open)}
            style={{
              width: "108px",
              height: "70px",
              border: "1px solid #2468b3",
              borderRadius: "10px",
              padding: "8px",
              background: "white",
              color: "#205b9f",
              fontSize: "15px",
              fontWeight: 700,
              lineHeight: 1.05,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: "19px", lineHeight: 1 }}>
              +
            </span>
            <span>Add Entry</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            style={{
              width: "108px",
              height: "70px",
              border: "1px solid #2468b3",
              borderRadius: "10px",
              padding: "8px",
              background: "white",
              color: "#205b9f",
              fontSize: "15px",
              fontWeight: 700,
              lineHeight: 1.05,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: "18px", lineHeight: 1 }}>
              🏠
            </span>
            <span>Main Menu</span>
          </button>
        </div>
      </div>

      {showAddEntry && (
        <div
          style={{
            background: "white",
            border: "1px solid #dbe7f3",
            borderRadius: "12px",
            padding: "12px 14px",
            marginBottom: "16px",
            boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "150px minmax(220px, 1fr) minmax(220px, 1fr) auto auto",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <input
              type="date"
              aria-label="Diary entry date"
              value={manualDate}
              onChange={(event) => setManualDate(event.target.value)}
              style={{
                border: "1px solid #b8cce2",
                borderRadius: "8px",
                padding: "9px 10px",
                fontSize: "14px",
                minWidth: 0,
              }}
            />

            <input
              type="text"
              aria-label="Diary entry title"
              value={manualTitle}
              onChange={(event) => setManualTitle(event.target.value)}
              placeholder="Title"
              style={{
                border: "1px solid #b8cce2",
                borderRadius: "8px",
                padding: "9px 10px",
                fontSize: "14px",
                minWidth: 0,
              }}
            />

            <input
              type="text"
              aria-label="Diary entry notes"
              value={manualNotes}
              onChange={(event) => setManualNotes(event.target.value)}
              placeholder="Notes (optional)"
              style={{
                border: "1px solid #b8cce2",
                borderRadius: "8px",
                padding: "9px 10px",
                fontSize: "14px",
                minWidth: 0,
              }}
            />

            <button
              type="button"
              onClick={saveManualEntry}
              disabled={!manualDate || !manualTitle.trim()}
              style={{
                border: "1px solid #2468b3",
                borderRadius: "8px",
                padding: "9px 14px",
                background:
                  !manualDate || !manualTitle.trim() ? "#cbd5e1" : "#205b9f",
                color: "white",
                fontWeight: 700,
                cursor:
                  !manualDate || !manualTitle.trim() ? "default" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Save
            </button>

            <button
              type="button"
              onClick={() => setShowAddEntry(false)}
              style={{
                border: "1px solid #b8cce2",
                borderRadius: "8px",
                padding: "9px 14px",
                background: "white",
                color: "#475569",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {redNotices.length > 0 && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "14px",
            padding: "20px 22px",
            marginBottom: "18px",
            boxShadow: "0 2px 8px rgba(185,28,28,0.06)",
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              color: "#991b1b",
              fontSize: "21px",
            }}
          >
            Immediate Action
          </h2>

          <div style={{ display: "grid", gap: "9px" }}>
            {redNotices.map((notice) => (
              <div
                key={notice.key}
                role="button"
                tabIndex={0}
                onClick={() => openRedNoticeSource(notice)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    openRedNoticeSource(notice);
                  }
                }}
                title={`Open ${notice.label} source`}
                style={{
                  background: "white",
                  border: "1px solid #fecaca",
                  borderRadius: "9px",
                  padding: "11px 14px",
                  cursor: "pointer",
                }}
              >
                <strong style={{ color: "#991b1b" }}>
                  {notice.eventName} — {notice.label}
                </strong>
                <div
                  style={{
                    marginTop: "3px",
                    color: "#64748b",
                    fontSize: "14px",
                  }}
                >
                  {notice.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          background: "white",
          border: "1px solid #dbe7f3",
          borderRadius: "14px",
          padding: "24px 26px",
          boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
        }}
      >
        {(view === "quick" || view === "events") && (
          <>
            <h2
              style={{
                margin: "0 0 18px",
                color: "#1e4f89",
                fontSize: "24px",
              }}
            >
              Upcoming Events
            </h2>

            {upcomingEvents.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "17px",
                }}
              >
                No upcoming events are currently dated.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "10px",
                }}
              >
                {upcomingEvents.map(({ record, date }) => (
                  <div
                    key={record.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenSource(record.id, "new")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        onOpenSource(record.id, "new");
                      }
                    }}
                    title="Open Event Details"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "190px 1fr",
                      gap: "20px",
                      alignItems: "center",
                      padding: "14px 16px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      background: "#fbfdff",
                      cursor: "pointer",
                    }}
                  >
                    <strong
                      style={{
                        color: "#205b9f",
                        fontSize: "16px",
                      }}
                    >
                      {formatDate(date)}
                    </strong>

                    <span
                      style={{
                        color: "#334155",
                        fontSize: "17px",
                        fontWeight: 600,
                      }}
                    >
                      {record.event.eventName || "Untitled Event"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === "quick" && upcomingManualEntries.length > 0 && (
          <div style={{ marginTop: "26px" }}>
            <h2
              style={{
                margin: "0 0 18px",
                color: "#1e4f89",
                fontSize: "24px",
              }}
            >
              Diary Entries
            </h2>

            <div style={{ display: "grid", gap: "10px" }}>
              {upcomingManualEntries.map(({ entry, date }) => {
                const isEditing = editingEntryId === entry.id;

                return (
                  <div
                    key={entry.id}
                    style={{
                      padding: "12px 16px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      background: "#fbfdff",
                    }}
                  >
                    {isEditing ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "150px minmax(180px, 1fr) minmax(180px, 1fr) auto auto",
                          gap: "9px",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="date"
                          value={editDate}
                          onChange={(event) => setEditDate(event.target.value)}
                          aria-label="Edit diary date"
                          style={{
                            border: "1px solid #b8cce2",
                            borderRadius: "8px",
                            padding: "8px 9px",
                            fontSize: "14px",
                            minWidth: 0,
                          }}
                        />
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                          aria-label="Edit diary title"
                          style={{
                            border: "1px solid #b8cce2",
                            borderRadius: "8px",
                            padding: "8px 9px",
                            fontSize: "14px",
                            minWidth: 0,
                          }}
                        />
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(event) => setEditNotes(event.target.value)}
                          placeholder="Notes (optional)"
                          aria-label="Edit diary notes"
                          style={{
                            border: "1px solid #b8cce2",
                            borderRadius: "8px",
                            padding: "8px 9px",
                            fontSize: "14px",
                            minWidth: 0,
                          }}
                        />
                        <button
                          type="button"
                          onClick={saveEditedEntry}
                          disabled={!editDate || !editTitle.trim()}
                          style={{
                            border: "1px solid #2468b3",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            background:
                              !editDate || !editTitle.trim()
                                ? "#cbd5e1"
                                : "#205b9f",
                            color: "white",
                            fontWeight: 700,
                            cursor:
                              !editDate || !editTitle.trim()
                                ? "default"
                                : "pointer",
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingEntry}
                          style={{
                            border: "1px solid #b8cce2",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            background: "white",
                            color: "#475569",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "190px 1fr auto",
                          gap: "20px",
                          alignItems: "center",
                        }}
                      >
                        <strong
                          style={{ color: "#205b9f", fontSize: "16px" }}
                        >
                          {formatDate(date)}
                        </strong>

                        <div>
                          <div
                            style={{
                              color: "#334155",
                              fontSize: "17px",
                              fontWeight: 600,
                            }}
                          >
                            {entry.title}
                          </div>
                          {entry.notes && (
                            <div
                              style={{
                                marginTop: "3px",
                                color: "#64748b",
                                fontSize: "14px",
                              }}
                            >
                              {entry.notes}
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "7px",
                            alignItems: "center",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => startEditingEntry(entry)}
                            style={{
                              border: "1px solid #b8cce2",
                              borderRadius: "8px",
                              padding: "7px 10px",
                              background: "white",
                              color: "#205b9f",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteManualEntry(entry)}
                            style={{
                              border: "1px solid #d6dee8",
                              borderRadius: "8px",
                              padding: "7px 10px",
                              background: "white",
                              color: "#b42318",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "full" && (
          <>
            <h2
              style={{
                margin: "0 0 18px",
                color: "#1e4f89",
                fontSize: "24px",
              }}
            >
              Full Diary
            </h2>

            {fullDiaryItems.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "17px",
                }}
              >
                No upcoming Diary items are currently dated.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {fullDiaryItems.map((item) => {
                  const isClickable = item.kind !== "manual";
                  return (
                    <div
                      key={item.key}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      onClick={isClickable ? () => openFullDiarySource(item) : undefined}
                      onKeyDown={isClickable ? (event) => {
                        if (event.key === "Enter" || event.key === " ") openFullDiarySource(item);
                      } : undefined}
                      title={item.kind === "event" ? "Open Event Details" : item.kind === "planning" ? "Open Event Planning Aid" : item.kind === "todo" ? "Open Event Checklist" : undefined}
                      style={{
                        display: "grid", gridTemplateColumns: "190px 1fr auto",
                        gap: "20px", alignItems: "center", padding: "12px 16px",
                        border: "1px solid #e2e8f0", borderRadius: "10px",
                        background: "#fbfdff", cursor: isClickable ? "pointer" : "default",
                      }}
                    >
                      <strong style={{ color: "#205b9f", fontSize: "16px" }}>{formatDate(item.date)}</strong>
                      <div>
                        <div style={{ color: "#334155", fontSize: "17px", fontWeight: 600 }}>{item.title}</div>
                        {item.notes && <div style={{ marginTop: "3px", color: "#64748b", fontSize: "14px" }}>{item.notes}</div>}
                      </div>
                      <span style={{ color: item.kind === "manual" ? "#64748b" : "#205b9f", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {fullDiaryLabel(item)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {view === "milestones" && (
          <>
            <h2
              style={{
                margin: "0 0 8px",
                color: "#1e4f89",
                fontSize: "24px",
              }}
            >
              Milestones
            </h2>
            <p
              style={{
                margin: "0 0 18px",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              Upcoming target dates from events using Event Planning Aid.
            </p>

            {planningDiaryItems.filter((item) => item.kind === "Target").length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "17px",
                }}
              >
                No upcoming Planning Aid milestones are currently due.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {planningDiaryItems
                  .filter((item) => item.kind === "Target")
                  .map((item) => (
                    <div
                      key={item.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenSource(item.recordId, "planningAid")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          onOpenSource(item.recordId, "planningAid");
                        }
                      }}
                      title="Open Event Planning Aid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "190px minmax(0, 1fr) auto",
                        gap: "20px",
                        alignItems: "center",
                        padding: "12px 16px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        background: "#fbfdff",
                        cursor: "pointer",
                      }}
                    >
                      <strong style={{ color: "#205b9f", fontSize: "16px" }}>
                        {formatDate(item.date)}
                      </strong>

                      <div>
                        <div
                          style={{
                            color: "#334155",
                            fontSize: "17px",
                            fontWeight: 600,
                          }}
                        >
                          {item.eventName} — {item.label}
                        </div>
                        <div
                          style={{
                            marginTop: "3px",
                            color: "#64748b",
                            fontSize: "14px",
                          }}
                        >
                          {item.detail}
                        </div>
                      </div>

                      <span
                        style={{
                          color: "#205b9f",
                          fontSize: "13px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Target
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        {view === "planning" && (
          <>
            <h2
              style={{
                margin: "0 0 8px",
                color: "#1e4f89",
                fontSize: "24px",
              }}
            >
              Planning
            </h2>
            <p
              style={{
                margin: "0 0 18px",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              Upcoming commencement and target dates from events using Event Planning Aid.
            </p>

            {planningDiaryItems.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "17px",
                }}
              >
                No upcoming Planning Aid dates are currently due.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {planningDiaryItems.map((item) => (
                  <div
                    key={item.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenSource(item.recordId, "planningAid")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        onOpenSource(item.recordId, "planningAid");
                      }
                    }}
                    title="Open Event Planning Aid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "190px minmax(0, 1fr) auto",
                      gap: "20px",
                      alignItems: "center",
                      padding: "12px 16px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      background: "#fbfdff",
                      cursor: "pointer",
                    }}
                  >
                    <strong style={{ color: "#205b9f", fontSize: "16px" }}>
                      {formatDate(item.date)}
                    </strong>

                    <div>
                      <div
                        style={{
                          color: "#334155",
                          fontSize: "17px",
                          fontWeight: 600,
                        }}
                      >
                        {item.eventName} — {item.label}
                      </div>
                      <div
                        style={{
                          marginTop: "3px",
                          color: "#64748b",
                          fontSize: "14px",
                        }}
                      >
                        {item.detail}
                      </div>
                    </div>

                    <span
                      style={{
                        color:
                          item.kind === "Commencement" ? "#64748b" : "#205b9f",
                        fontSize: "13px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.kind}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === "todos" && (
          <>
            <h2
              style={{
                margin: "0 0 8px",
                color: "#1e4f89",
                fontSize: "24px",
              }}
            >
              To Dos
            </h2>
            <p
              style={{
                margin: "0 0 18px",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              Dated incomplete tasks from current Event Desk checklists.
            </p>

            {diaryToDoItems.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "17px",
                }}
              >
                No dated incomplete To Dos are currently recorded.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {diaryToDoItems.map((item) => (
                  <div
                    key={item.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenSource(item.recordId, "checklist")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        onOpenSource(item.recordId, "checklist");
                      }
                    }}
                    title="Open Event Checklist"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "190px minmax(0, 1fr) auto",
                      gap: "20px",
                      alignItems: "center",
                      padding: "12px 16px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      background: "#fbfdff",
                      cursor: "pointer",
                    }}
                  >
                    <strong style={{ color: "#205b9f", fontSize: "16px" }}>
                      {formatDate(item.date)}
                    </strong>

                    <div>
                      <div
                        style={{
                          color: "#334155",
                          fontSize: "17px",
                          fontWeight: 600,
                        }}
                      >
                        {item.eventName} — {item.text}
                      </div>
                      <div
                        style={{
                          marginTop: "3px",
                          color: "#64748b",
                          fontSize: "14px",
                        }}
                      >
                        {item.category}
                        {item.assignedTo ? ` • ${item.assignedTo}` : ""}
                      </div>
                    </div>

                    <span
                      style={{
                        color: "#205b9f",
                        fontSize: "13px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      To Do
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === "history" && (
          <>
            <h2
              style={{
                margin: "0 0 8px",
                color: "#1e4f89",
                fontSize: "24px",
              }}
            >
              History
            </h2>
            <p
              style={{
                margin: "0 0 18px",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              Past events, past manual diary entries and completed dated To Dos.
            </p>

            {historyItems.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "17px",
                }}
              >
                No Diary history is currently recorded.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {historyItems.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "190px minmax(0, 1fr) auto",
                      gap: "20px",
                      alignItems: "center",
                      padding: "12px 16px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      background: "#fbfdff",
                    }}
                  >
                    <strong style={{ color: "#64748b", fontSize: "16px" }}>
                      {formatDate(item.date)}
                    </strong>

                    <div>
                      <div
                        style={{
                          color: "#334155",
                          fontSize: "17px",
                          fontWeight: 600,
                        }}
                      >
                        {item.title}
                      </div>
                      {item.detail && (
                        <div
                          style={{
                            marginTop: "3px",
                            color: "#64748b",
                            fontSize: "14px",
                          }}
                        >
                          {item.detail}
                        </div>
                      )}
                    </div>

                    <span
                      style={{
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.kind}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
