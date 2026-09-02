// Revision: Multi-poster Event Media support — up to 3 posters per event
import { useEffect, useState } from "react";

import "./App.css";
import logo from "./assets/Emblem.png";

import type { Player } from "./types/Player";
import type { Event } from "./types/Event";

import Dashboard from "./components/Dashboard";
import NewEvent from "./components/NewEvent";
import Competition from "./components/Competition";
import Players from "./components/Players";
import HandicapUpdate from "./components/HandicapUpdate";
import FieldManagement from "./components/FieldManagement";
import Catering from "./components/Catering";
import Posters from "./components/Posters";
import PosterPreview from "./components/PosterPreview";
import ReviewPublish from "./components/ReviewPublish";
import EventOutput from "./components/EventOutput";
import DrawPreview from "./components/DrawPreview";
import type { DrawPreviewData } from "./components/DrawPreview";

const EVENT_KEY = "eventDeskEvent";
const PLAYERS_KEY = "eventDeskPlayers";
const POSTER_KEY = "eventDeskAttachedPoster";
const PUBLISHED_EVENT_KEY =
  "eventDeskPublishedEvent";
const PUBLISHED_SNAPSHOT_KEY =
  "eventDeskPublishedSnapshot";
const PUBLICATION_META_KEY =
  "eventDeskPublicationMeta";
const ARCHIVED_EVENT_KEY =
  "eventDeskArchivedEvent";

const defaultEvent: Event = {
  eventNumber: "0001",
  eventName:
    "Monday Club Home & Away Championship",
  eventDate: "",
  venue: "Ramsdale Park Golf Club",
  competition: "Pairs Championship",
  entryFee: 15,
  playerLimit: 76,
  competitionCategory: "",
  competitionFormat: "",
  competitionRounds: 1,
  handicapAllowance: 100,
  teeColour: "Yellow",
  competitionRules: "",
};

interface PublishedSnapshot {
  event: Event;
  players: Player[];
  attachedPosterId: string | null;
  attachedPosterIds: string[];
}

interface PublicationMeta {
  publicationCount: number;
  firstPublishedAt: string | null;
  lastPublishedAt: string | null;
}

interface ArchivedEvent {
  snapshot: PublishedSnapshot;
  publicationMeta: PublicationMeta;
  archivedAt: string;
}

interface EventRecord {
  id: string;
  event: Event;
  players: Player[];
  attachedPosterId: string | null;
  attachedPosterIds: string[];
  published: boolean;
  publishedSnapshot: PublishedSnapshot | null;
  publicationMeta: PublicationMeta;
  archived: boolean;
  archivedAt: string | null;
}

const EVENT_RECORDS_KEY = "eventDeskEventRecords";
const ACTIVE_EVENT_ID_KEY = "eventDeskActiveEventId";
const CURRENT_WORKING_EVENT_ID_KEY = "eventDeskCurrentWorkingEventId";

const createEventRecord = (event: Event): EventRecord => ({
  id: event.eventNumber,
  event,
  players: [],
  attachedPosterId: null,
  attachedPosterIds: [],
  published: false,
  publishedSnapshot: null,
  publicationMeta: {
    publicationCount: 0,
    firstPublishedAt: null,
    lastPublishedAt: null,
  },
  archived: false,
  archivedAt: null,
});

const loadInitialEventRecords = (): EventRecord[] => {
  try {
    const savedRecords = localStorage.getItem(EVENT_RECORDS_KEY);

    if (savedRecords) {
      const parsed = JSON.parse(savedRecords);

      if (Array.isArray(parsed) && parsed.length > 0) {
        /* Validate persisted archive flags so a stale/invalid flag cannot
           lock a newly created or recently opened event. */
        const today = new Date();

        return parsed.map((record) => {
          const migratedPosterIds = Array.isArray(record?.attachedPosterIds)
            ? record.attachedPosterIds.filter((id: unknown): id is string => typeof id === "string")
            : record?.attachedPosterId
            ? [record.attachedPosterId]
            : [];

          record = {
            ...record,
            attachedPosterIds: migratedPosterIds,
            attachedPosterId: migratedPosterIds[0] ?? null,
          };

          if (!record?.archived) return record;

          const eventDate = record.event?.eventDate
            ? new Date(`${record.event.eventDate}T00:00:00`)
            : null;

          if (
            !record.published ||
            !record.publishedSnapshot ||
            !record.archivedAt ||
            !eventDate ||
            Number.isNaN(eventDate.getTime())
          ) {
            return { ...record, archived: false, archivedAt: null };
          }

          eventDate.setDate(eventDate.getDate() + 5);

          return today >= eventDate
            ? record
            : { ...record, archived: false, archivedAt: null };
        });
      }
    }

    const savedEvent = localStorage.getItem(EVENT_KEY);
    const savedPlayers = localStorage.getItem(PLAYERS_KEY);
    const savedPoster = localStorage.getItem(POSTER_KEY);
    const savedPublished =
      localStorage.getItem(PUBLISHED_EVENT_KEY) === "true";
    const savedSnapshot = localStorage.getItem(PUBLISHED_SNAPSHOT_KEY);
    const savedMeta = localStorage.getItem(PUBLICATION_META_KEY);
    const savedArchived = localStorage.getItem(ARCHIVED_EVENT_KEY);

    const event = savedEvent
      ? JSON.parse(savedEvent)
      : defaultEvent;

    const players = savedPlayers
      ? JSON.parse(savedPlayers)
      : [];

    const publicationMeta: PublicationMeta = savedMeta
      ? JSON.parse(savedMeta)
      : {
          publicationCount: 0,
          firstPublishedAt: null,
          lastPublishedAt: null,
        };

    if (savedArchived) {
      const archivedEvent: ArchivedEvent =
        JSON.parse(savedArchived);

      return [
        {
          id: archivedEvent.snapshot.event.eventNumber,
          event: archivedEvent.snapshot.event,
          players: archivedEvent.snapshot.players,
          attachedPosterId: archivedEvent.snapshot.attachedPosterIds?.[0] ?? archivedEvent.snapshot.attachedPosterId,
          attachedPosterIds: archivedEvent.snapshot.attachedPosterIds ?? (archivedEvent.snapshot.attachedPosterId ? [archivedEvent.snapshot.attachedPosterId] : []),
          published: true,
          publishedSnapshot: archivedEvent.snapshot,
          publicationMeta: archivedEvent.publicationMeta,
          archived: true,
          archivedAt: archivedEvent.archivedAt,
        },
      ];
    }

    return [
      {
        id: event.eventNumber,
        event,
        players,
        attachedPosterId: savedPoster,
        attachedPosterIds: savedPoster ? [savedPoster] : [],
        published: savedPublished,
        publishedSnapshot: savedSnapshot
          ? JSON.parse(savedSnapshot)
          : null,
        publicationMeta,
        archived: false,
        archivedAt: null,
      },
    ];
  } catch (error) {
    console.error("Failed to load event records", error);
    return [createEventRecord(defaultEvent)];
  }
};

export default function App() {

  const [currentPage, setCurrentPage] =
    useState("dashboard");

  const [eventRecords, setEventRecords] =
    useState<EventRecord[]>(loadInitialEventRecords);

  const [activeEventId, setActiveEventId] =
    useState(() => {
      try {
        const savedId =
          localStorage.getItem(ACTIVE_EVENT_ID_KEY);

        if (
          savedId &&
          eventRecords.some((record) => record.id === savedId)
        ) {
          return savedId;
        }
      } catch {
        // Fall through to the first available event.
      }

      return (
        eventRecords[0]?.id ??
        defaultEvent.eventNumber
      );
    });

  /*
   * CURRENT WORKING EVENT
   *
   * This is deliberately separate from activeEventId. Opening an archived
   * event for reference may change activeEventId, but it must not change the
   * event that Continue Event considers to be the current working event.
   */
  const [currentWorkingEventId, setCurrentWorkingEventId] =
    useState<string | null>(() => {
      try {
        const savedId = localStorage.getItem(
          CURRENT_WORKING_EVENT_ID_KEY
        );

        if (
          savedId &&
          eventRecords.some(
            (record) => record.id === savedId && !record.archived
          )
        ) {
          return savedId;
        }
      } catch {
        // Fall through to the first non-archived event.
      }

      return (
        eventRecords.find((record) => !record.archived)?.id ??
        null
      );
    });

  const activeEventRecord =
    eventRecords.find(
      (record) => record.id === activeEventId
    );

  /*
   * SINGLE-SOURCE PLAYER UPDATE
   *
   * Players are part of the active EventRecord. Every player change
   * therefore updates React state AND the persisted event record
   * immediately. This removes the previous dependency on multiple
   * competing effects/legacy player storage.
   */
  const handlePlayersChange: React.Dispatch<
    React.SetStateAction<Player[]>
  > = (update) => {
    const nextPlayers =
      typeof update === "function"
        ? update(players)
        : update;

    const nextRecords = eventRecords.map((record) =>
      record.id === activeEventId
        ? { ...record, players: nextPlayers }
        : record
    );

    setPlayers(nextPlayers);
    setEventRecords(nextRecords);

    try {
      localStorage.setItem(
        EVENT_RECORDS_KEY,
        JSON.stringify(nextRecords)
      );
      localStorage.setItem(
        PLAYERS_KEY,
        JSON.stringify(nextPlayers)
      );
      localStorage.setItem(
        ACTIVE_EVENT_ID_KEY,
        activeEventId
      );
    } catch (error) {
      console.error(
        "Failed to persist player changes",
        error
      );
    }
  };

  /*
   * LOAD THE ACTIVE EVENT FROM ITS EVENT RECORD.
   *
   * Event Desk stores each event, including its players,
   * as one record. On refresh we must restore the active
   * event from that record rather than loading an older
   * copy from the legacy global player/event keys.
   */

  const [players, setPlayers] =
    useState<Player[]>(() => {
      if (activeEventRecord) {
        return activeEventRecord.players ?? [];
      }

      try {
        const savedPlayers =
          localStorage.getItem(PLAYERS_KEY);

        return savedPlayers
          ? JSON.parse(savedPlayers)
          : [];
      } catch (error) {
        console.error(
          "Failed to load players",
          error
        );

        return [];
      }
    });

  const [event, setEvent] =
    useState<Event>(() => {
      if (activeEventRecord) {
        return activeEventRecord.event;
      }

      try {
        const savedEvent =
          localStorage.getItem(EVENT_KEY);

        return savedEvent
          ? JSON.parse(savedEvent)
          : defaultEvent;
      } catch (error) {
        console.error(
          "Failed to load event",
          error
        );

        return defaultEvent;
      }
    });

  const [attachedPosterIds, setAttachedPosterIds] =
    useState<string[]>(() => {
      if (activeEventRecord) {
        if (Array.isArray(activeEventRecord.attachedPosterIds)) {
          return activeEventRecord.attachedPosterIds;
        }
        return activeEventRecord.attachedPosterId
          ? [activeEventRecord.attachedPosterId]
          : [];
      }

      try {
        const savedPoster = localStorage.getItem(POSTER_KEY);
        return savedPoster ? [savedPoster] : [];
      } catch {
        return [];
      }
    });

  const attachedPosterId = attachedPosterIds[0] ?? null;

  const [previewPosterId, setPreviewPosterId] =
    useState<string | null>(null);

  const [drawPreviewData, setDrawPreviewData] =
    useState<DrawPreviewData | null>(null);

  const [published, setPublished] =
    useState(() => {
      if (activeEventRecord) {
        return activeEventRecord.published;
      }

      try {
        return (
          localStorage.getItem(
            PUBLISHED_EVENT_KEY
          ) === "true"
        );
      } catch {
        return false;
      }
    });

  const [publishedSnapshot, setPublishedSnapshot] =
    useState<PublishedSnapshot | null>(() => {
      if (activeEventRecord) {
        return activeEventRecord.publishedSnapshot;
      }

      try {
        const savedSnapshot =
          localStorage.getItem(
            PUBLISHED_SNAPSHOT_KEY
          );

        return savedSnapshot
          ? JSON.parse(savedSnapshot)
          : null;
      } catch (error) {
        console.error(
          "Failed to load published snapshot",
          error
        );

        return null;
      }
    });

  const [publicationMeta, setPublicationMeta] =
    useState<PublicationMeta>(() => {
      if (activeEventRecord) {
        return activeEventRecord.publicationMeta;
      }

      try {
        const savedMeta =
          localStorage.getItem(
            PUBLICATION_META_KEY
          );

        if (savedMeta) {
          return JSON.parse(savedMeta);
        }

        return {
          publicationCount: 0,
          firstPublishedAt: null,
          lastPublishedAt: null,
        };
      } catch (error) {
        console.error(
          "Failed to load publication history",
          error
        );

        return {
          publicationCount: 0,
          firstPublishedAt: null,
          lastPublishedAt: null,
        };
      }
    });

  const [archived, setArchived] =
    useState(() => {
      if (activeEventRecord) {
        return activeEventRecord.archived;
      }

      try {
        return (
          localStorage.getItem(
            ARCHIVED_EVENT_KEY
          ) !== null
        );
      } catch {
        return false;
      }
    });

  /*
   * SAVE EVENT COLLECTION STRUCTURE
   *
   * Player changes are persisted immediately by handlePlayersChange.
   * This effect is therefore limited to structural event changes and
   * event selection. It never writes player data from a potentially
   * stale render.
   */

  useEffect(() => {
    try {
      const persistedRecords = eventRecords.map((record) =>
        record.id === activeEventId
          ? { ...record, event, attachedPosterId, attachedPosterIds, published, publishedSnapshot, publicationMeta, archived }
          : record
      );

      localStorage.setItem(
        EVENT_RECORDS_KEY,
        JSON.stringify(persistedRecords)
      );
      localStorage.setItem(
        ACTIVE_EVENT_ID_KEY,
        activeEventId
      );

      if (currentWorkingEventId) {
        localStorage.setItem(
          CURRENT_WORKING_EVENT_ID_KEY,
          currentWorkingEventId
        );
      } else {
        localStorage.removeItem(
          CURRENT_WORKING_EVENT_ID_KEY
        );
      }
    } catch (error) {
      console.error(
        "Failed to save event collection",
        error
      );
    }
  }, [
    eventRecords,
    activeEventId,
    currentWorkingEventId,
    event,
    attachedPosterId,
    attachedPosterIds,
    published,
    publishedSnapshot,
    publicationMeta,
    archived,
  ]);

  /*
   * SAVE EVENT DETAILS
   */

  useEffect(() => {
    if (archived) {
      return;
    }

    try {
      localStorage.setItem(
        EVENT_KEY,
        JSON.stringify(event)
      );
    } catch (error) {
      console.error(
        "Failed to save event",
        error
      );
    }
  }, [event, archived]);

  /*
   * SAVE PLAYERS
   */

  useEffect(() => {
    if (archived) {
      return;
    }

    try {
      localStorage.setItem(
        PLAYERS_KEY,
        JSON.stringify(players)
      );
    } catch (error) {
      console.error(
        "Failed to save players",
        error
      );
    }
  }, [players, archived]);

  /*
   * SAVE ATTACHED POSTER
   */

  useEffect(() => {
    if (archived) {
      return;
    }

    try {
      if (attachedPosterIds.length > 0) {
        localStorage.setItem(
          POSTER_KEY,
          attachedPosterIds[0]
        );
      } else {
        localStorage.removeItem(POSTER_KEY);
      }
    } catch (error) {
      console.error(
        "Failed to save attached poster",
        error
      );
    }
  }, [attachedPosterIds, archived]);

  /*
   * SAVE PUBLICATION HISTORY
   */

  useEffect(() => {
    try {
      localStorage.setItem(
        PUBLICATION_META_KEY,
        JSON.stringify(publicationMeta)
      );
    } catch (error) {
      console.error(
        "Failed to save publication history",
        error
      );
    }
  }, [publicationMeta]);

  /*
   * CURRENT EVENT VERSION
   */

  const currentSnapshot: PublishedSnapshot = {
    event,
    players,
    attachedPosterId,
    attachedPosterIds,
  };

  /*
   * HAS THE EVENT CHANGED SINCE LAST
   * PUBLICATION?
   */

  const hasUnpublishedChanges =
    publishedSnapshot === null ||
    JSON.stringify(currentSnapshot) !==
      JSON.stringify(publishedSnapshot);

  /*
   * CURRENTLY PUBLISHED
   */

  const isCurrentlyPublished =
    published &&
    !hasUnpublishedChanges &&
    !archived;

  /*
   * PUBLISH / REPUBLISH
   */

  const handlePublish = () => {
    if (archived) {
      return;
    }

    try {
      const now =
        new Date().toISOString();

      const isFirstPublication =
        publicationMeta.publicationCount === 0;

      const updatedMeta: PublicationMeta = {
        publicationCount:
          publicationMeta.publicationCount + 1,
        firstPublishedAt:
          isFirstPublication
            ? now
            : publicationMeta.firstPublishedAt,
        lastPublishedAt: now,
      };

      localStorage.setItem(
        PUBLISHED_EVENT_KEY,
        "true"
      );

      localStorage.setItem(
        PUBLISHED_SNAPSHOT_KEY,
        JSON.stringify(currentSnapshot)
      );

      localStorage.setItem(
        PUBLICATION_META_KEY,
        JSON.stringify(updatedMeta)
      );

      setPublishedSnapshot(
        currentSnapshot
      );

      setPublicationMeta(
        updatedMeta
      );

      setPublished(true);
    } catch (error) {
      console.error(
        "Failed to publish event",
        error
      );
    }
  };

  /*
   * FIVE-DAY CLOSE ELIGIBILITY
   *
   * The event becomes eligible to close
   * five calendar days after the event date.
   */

  const getCloseEligibleDate = () => {
    if (!event.eventDate) {
      return null;
    }

    const eventDate = new Date(
      `${event.eventDate}T00:00:00`
    );

    if (
      Number.isNaN(
        eventDate.getTime()
      )
    ) {
      return null;
    }

    eventDate.setDate(
      eventDate.getDate() + 5
    );

    return eventDate;
  };

  const closeEligibleDate =
    getCloseEligibleDate();

  const today = new Date();

  const closeEligible =
    closeEligibleDate !== null &&
    today >= closeEligibleDate;

  /*
   * ARCHIVE READINESS
   *
   * An event must be a properly completed event before
   * it can become a permanent historical record.
   * This prevents an incomplete test/draft event from
   * accidentally being archived.
   */

  const archiveRequirements = [
    {
      label: "Event name",
      complete: Boolean(event.eventName.trim()),
    },
    {
      label: "Event date",
      complete: Boolean(event.eventDate.trim()),
    },
    {
      label: "Venue",
      complete: Boolean(event.venue.trim()),
    },
    {
      label: "Competition",
      complete: Boolean(event.competition.trim()),
    },
    {
      label: "At least one player",
      complete: players.length > 0,
    },
    {
      label: "Event poster",
      complete: Boolean(attachedPosterId),
    },
  ];

  const archiveReady =
    archiveRequirements.every(
      (requirement) => requirement.complete
    );

  const archiveMissingRequirements =
    archiveRequirements
      .filter(
        (requirement) => !requirement.complete
      )
      .map((requirement) => requirement.label);

  /*
   * CLOSE & ARCHIVE
   */

  const handleCloseArchive = () => {
    if (archived) {
      return;
    }

    if (!isCurrentlyPublished || !closeEligible) {
      return;
    }

    if (!archiveReady) {
      window.alert(
        `This event cannot be archived yet.\n\nPlease complete the following before closing the event:\n\n• ${archiveMissingRequirements.join("\n• " )}`
      );
      return;
    }

    try {
      const archivedAt =
        new Date().toISOString();

      const archivedEvent: ArchivedEvent = {
        snapshot: currentSnapshot,
        publicationMeta,
        archivedAt,
      };

      localStorage.setItem(
        ARCHIVED_EVENT_KEY,
        JSON.stringify(
          archivedEvent
        )
      );

      setEventRecords((records) =>
        records.map((record) =>
          record.id === activeEventId
            ? {
                ...record,
                archived: true,
                archivedAt,
              }
            : record
        )
      );

      setArchived(true);

      if (currentWorkingEventId === activeEventId) {
        const nextWorkingRecord = eventRecords.find(
          (record) =>
            record.id !== activeEventId && !record.archived
        );

        setCurrentWorkingEventId(
          nextWorkingRecord?.id ?? null
        );
      }

      setCurrentPage(
        "reviewPublish"
      );
    } catch (error) {
      console.error(
        "Failed to archive event",
        error
      );
    }
  };

  /*
   * NAVIGATION
   *
   * Archived events remain fully navigable so the
   * historical record can be reviewed. Editing is
   * disabled separately on the archived setup pages.
   */

  const buildCurrentRecord = (): EventRecord => ({
    id: activeEventId,
    event,
    players,
    attachedPosterId,
    attachedPosterIds,
    published,
    publishedSnapshot,
    publicationMeta,
    archived,
    archivedAt:
      eventRecords.find(
        (record) => record.id === activeEventId
      )?.archivedAt ?? null,
  });

  const getNextEventNumber = () => {
    const highestNumber = eventRecords.reduce(
      (highest, record) => {
        const number = Number.parseInt(
          record.event.eventNumber,
          10
        );

        return Number.isNaN(number)
          ? highest
          : Math.max(highest, number);
      },
      0
    );

    return String(highestNumber + 1).padStart(4, "0");
  };

  const handleOpenEventManager = () => {
    setCurrentPage("eventManager");
  };

  /*
   * CONTINUE CURRENT EVENT
   *
   * Resume the current working event. This is deliberately separate from
   * activeEventId because opening an archived event for reference must not
   * change what Continue Event considers to be the working event.
   *
   * It also never creates a new event or increases the event number.
   */
  const handleContinueEvent = () => {
    const record = eventRecords.find(
      (item) =>
        item.id === currentWorkingEventId && !item.archived
    );

    if (!record) {
      handleOpenEventManager();
      return;
    }

    setActiveEventId(record.id);

    if (!record.archived) {
      setCurrentWorkingEventId(record.id);
    }

    setEvent(record.event);
    setPlayers(record.players);
    setAttachedPosterIds(record.attachedPosterIds ?? (record.attachedPosterId ? [record.attachedPosterId] : []));
    setPreviewPosterId(null);
    setDrawPreviewData(null);
    setPublished(record.published);
    setPublishedSnapshot(record.publishedSnapshot);
    setPublicationMeta(record.publicationMeta);
    setArchived(false);
    setCurrentPage("new");
  };

  const handleNewEvent = () => {
    const newEvent: Event = {
      eventNumber: getNextEventNumber(),
      eventName: "",
      eventDate: "",
      venue: "",
      competition: "",
      entryFee: 15,
      playerLimit: 76,
      competitionCategory: "",
      competitionFormat: "",
      competitionRounds: 1,
      handicapAllowance: 100,
      teeColour: "Yellow",
      competitionRules: "",
    };

    const newRecord = createEventRecord(newEvent);

    setEventRecords((records) => [
      ...records.map((record) =>
        record.id === activeEventId
          ? buildCurrentRecord()
          : record
      ),
      newRecord,
    ]);

    setActiveEventId(newRecord.id);
    setCurrentWorkingEventId(newRecord.id);
    setEvent(newEvent);
    setPlayers([]);
    setAttachedPosterIds([]);
    setPreviewPosterId(null);
    setDrawPreviewData(null);
    setPublished(false);
    setPublishedSnapshot(null);
    setPublicationMeta({
      publicationCount: 0,
      firstPublishedAt: null,
      lastPublishedAt: null,
    });
    setArchived(false);

    // A new event must never inherit the legacy single-event archive marker.
    try {
      localStorage.removeItem(ARCHIVED_EVENT_KEY);
    } catch (error) {
      console.error("Failed to clear legacy archive marker", error);
    }

    setCurrentPage("new");
  };

  const handleDeleteEvent = (record: EventRecord) => {
    // Events can be deleted from Event Manager when they are no longer wanted.
    // This is particularly useful during initial setup and testing, where
    // unwanted published/test events may otherwise be impossible to remove.
    // Deletion is always confirmed and is permanent.
    const eventState = record.archived
      ? "archived"
      : record.published
      ? "published"
      : "draft";

    const confirmed = window.confirm(
      `Delete Event ${record.event.eventNumber}?\n\nThis will permanently remove this ${eventState} event and all of its stored player/event data. This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    const remainingRecords = eventRecords.filter(
      (item) => item.id !== record.id
    );

    // Keep at least one event available in the Event Desk.
    if (remainingRecords.length === 0) {
      window.alert(
        "At least one event must remain in the Event Desk. Create another event before deleting this draft."
      );
      return;
    }

    setEventRecords(remainingRecords);

    if (record.id === currentWorkingEventId) {
      const nextWorkingRecord = remainingRecords.find(
        (item) => !item.archived
      );
      setCurrentWorkingEventId(
        nextWorkingRecord?.id ?? null
      );
    }

    if (record.id === activeEventId) {
      const nextRecord = remainingRecords[0];

      setActiveEventId(nextRecord.id);

      if (!nextRecord.archived) {
        setCurrentWorkingEventId(nextRecord.id);
      } else {
        const nextWorkingRecord = remainingRecords.find(
          (item) => !item.archived
        );
        setCurrentWorkingEventId(
          nextWorkingRecord?.id ?? null
        );
      }

      setEvent(nextRecord.event);
      setPlayers(nextRecord.players);
      setAttachedPosterIds(nextRecord.attachedPosterIds ?? (nextRecord.attachedPosterId ? [nextRecord.attachedPosterId] : []));
      setPreviewPosterId(null);
      setPublished(nextRecord.published);
      setPublishedSnapshot(nextRecord.publishedSnapshot);
      setPublicationMeta(nextRecord.publicationMeta);
      setArchived(nextRecord.archived);
      setCurrentPage(
        nextRecord.archived ? "reviewPublish" : "new"
      );
    }
  };

  const handleOpenEvent = (record: EventRecord) => {
    if (record.id === activeEventId) {
      setCurrentPage(
        record.archived ? "reviewPublish" : "new"
      );
      return;
    }

    setEventRecords((records) =>
      records.map((item) =>
        item.id === activeEventId
          ? buildCurrentRecord()
          : item
      )
    );

    setActiveEventId(record.id);
    setEvent(record.event);
    setPlayers(record.players);
    setAttachedPosterIds(record.attachedPosterIds ?? (record.attachedPosterId ? [record.attachedPosterId] : []));
    setPreviewPosterId(null);
    setDrawPreviewData(null);
    setPublished(record.published);
    setPublishedSnapshot(record.publishedSnapshot);
    setPublicationMeta(record.publicationMeta);
    setArchived(record.archived);
    setCurrentPage(
      record.archived ? "reviewPublish" : "new"
    );
  };

  const handleNavigate = (
    page: string
  ) => {
    if (page === "eventManager") {
      handleOpenEventManager();
      return;
    }

    if (page !== "drawPreview") {
      setDrawPreviewData(null);
    }

    setCurrentPage(page);
  };

  /*
   * ARCHIVED SETUP PAGES
   *
   * These pages remain visible for reference after
   * archiving, but their controls are locked. Review,
   * Event Output and Posters remain interactive because
   * they provide read-only reference/output functions.
   */

  const archivedSetupPage =
    archived &&
    (
      currentPage === "new" ||
      currentPage === "competition" ||
      currentPage === "players" ||
      currentPage === "handicap" ||
      currentPage === "field" ||
      currentPage === "catering"
    );

  /*
   * EVENT NAVIGATION
   */

  const eventOpen =
    currentPage !== "dashboard" &&
    currentPage !== "eventManager" &&
    currentPage !== "posterPreview" &&
    currentPage !== "drawPreview";

  const appMode =
    (
      currentPage === "posterPreview" ||
      currentPage === "drawPreview"
    )
      ? "preview-mode"
      : eventOpen
      ? "event-mode"
      : "dashboard-mode";

  return (
    <div className={`app ${appMode}`}>

      <header className="header">

        <img
          src={logo}
          alt="Ramsdale Park Golf Club"
          className="logo"
        />

        <div className="header-title">

          <h1>
            Ramsdale Seniors Event Desk
          </h1>

          <p>
            Special Events Management
          </p>

        </div>

        {eventOpen && (
          <button
            type="button"
            onClick={handleOpenEventManager}
            style={{
              position: "absolute",
              right: "28px",
              bottom: "18px",
              border: "1px solid #2f6db5",
              borderRadius: "10px",
              padding: "10px 16px",
              background: "white",
              color: "#1f5b9f",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
            }}
          >
            📋 Event Desk
          </button>
        )}

      </header>

      {eventOpen && (

        <aside className="sidebar">

          <h3>EVENT SETUP</h3>

          <ul>

            <li
              className={
                currentPage === "new"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleNavigate("new")
              }
            >
              🏌️ Event Details
            </li>

            <li
              className={
                currentPage === "competition"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleNavigate(
                  "competition"
                )
              }
            >
              🏆 Competition
            </li>

            <li
              className={
                currentPage === "players"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleNavigate("players")
              }
            >
              👥 Players
            </li>

            <li
              className={
                currentPage === "handicap"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleNavigate("handicap")
              }
            >
              🏌️ Field & Draw
            </li>

            <li
              className={
                currentPage === "field"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleNavigate("field")
              }
            >
              📋 Field Management
            </li>

            <li
              className={
                currentPage === "catering"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleNavigate("catering")
              }
            >
              🍽 Catering
            </li>

            <li
              className={
                currentPage === "posters"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleNavigate("posters")
              }
            >
              🎨 Posters
            </li>

            <li>
              ❤️ Charity
            </li>

            <li>
              📖 Booklets
            </li>

            <li
              className={
                currentPage ===
                "reviewPublish"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleNavigate(
                  "reviewPublish"
                )
              }
            >
              ✅ Review & Publish
            </li>

          </ul>

        </aside>

      )}

      <main
        className={
          (
            currentPage === "posterPreview" ||
            currentPage === "drawPreview"
          )
            ? "preview-main"
            : "main"
        }
      >

        <div
          className="app-workspace"
          style={
            archivedSetupPage
              ? {
                  pointerEvents: "none",
                  userSelect: "text",
                }
              : undefined
          }
          aria-disabled={
            archivedSetupPage
              ? true
              : undefined
          }
          onKeyDown={
            archivedSetupPage
              ? (e) => e.preventDefault()
              : undefined
          }
        >

          {currentPage === "eventManager" && (
            <div
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
                  alignItems: "center",
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
                    Event Desk
                  </h1>
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "#64748b",
                      fontSize: "18px",
                    }}
                  >
                    Create, open and manage your Ramsdale Seniors events.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNewEvent}
                  style={{
                    border: "none",
                    borderRadius: "10px",
                    padding: "14px 22px",
                    background: "#2468b3",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 3px 8px rgba(36,104,179,0.25)",
                  }}
                >
                  + New Event
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "16px",
                }}
              >
                {eventRecords
                  .slice()
                  .sort((a, b) =>
                    Number.parseInt(b.event.eventNumber, 10) -
                    Number.parseInt(a.event.eventNumber, 10)
                  )
                  .map((record) => {
                    const status = record.archived
                      ? "Archived"
                      : record.published
                      ? "Published"
                      : "Draft";

                    const statusBackground = record.archived
                      ? "#f1f5f9"
                      : record.published
                      ? "#ecfdf3"
                      : "#fff7ed";

                    const statusColor = record.archived
                      ? "#64748b"
                      : record.published
                      ? "#15803d"
                      : "#c2410c";

                    return (
                      <div
                        key={record.id}
                        style={{
                          background: "white",
                          border: "1px solid #dbe7f3",
                          borderRadius: "14px",
                          padding: "20px 24px",
                          display: "grid",
                          gridTemplateColumns: "90px 1fr auto",
                          alignItems: "center",
                          gap: "22px",
                          boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
                        }}
                      >
                        <div
                          style={{
                            background: "#eef6ff",
                            color: "#205b9f",
                            borderRadius: "10px",
                            padding: "12px 8px",
                            textAlign: "center",
                            fontWeight: 800,
                          }}
                        >
                          <div style={{ fontSize: "12px" }}>EVENT</div>
                          <div style={{ fontSize: "22px" }}>
                            {record.event.eventNumber}
                          </div>
                        </div>

                        <div>
                          <h2
                            style={{
                              margin: 0,
                              color: "#1e4f89",
                              fontSize: "22px",
                            }}
                          >
                            {record.event.eventName || "Untitled Event"}
                          </h2>
                          <p
                            style={{
                              margin: "6px 0 0",
                              color: "#64748b",
                            }}
                          >
                            {record.event.eventDate || "Date not yet entered"}
                            {record.event.venue
                              ? ` • ${record.event.venue}`
                              : ""}
                          </p>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <span
                            style={{
                              background: statusBackground,
                              color: statusColor,
                              borderRadius: "999px",
                              padding: "8px 12px",
                              fontWeight: 700,
                              fontSize: "13px",
                            }}
                          >
                            {status}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleOpenEvent(record)}
                            style={{
                              border: "1px solid #2f6db5",
                              borderRadius: "9px",
                              padding: "9px 15px",
                              background: "white",
                              color: "#205b9f",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {record.archived ? "View" : "Open"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(record)}
                            title="Permanently delete this event"
                            aria-label={`Delete Event ${record.event.eventNumber}`}
                            style={{
                              border: "1px solid #d6dee8",
                              borderRadius: "9px",
                              padding: "9px 11px",
                              background: "white",
                              color: "#b42318",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {currentPage === "dashboard" && (
            <Dashboard
              onNewEvent={handleNewEvent}
              onContinueEvent={handleContinueEvent}
            />
          )}

          {currentPage === "new" && (
            <NewEvent
              event={event}
              players={players}
              setEvent={setEvent}
              attachedPosterIds={
                attachedPosterIds
              }
              onAttachPoster={() =>
                handleNavigate(
                  "posters"
                )
              }
              onDeleteEvent={() =>
                handleDeleteEvent(
                  buildCurrentRecord()
                )
              }
              canDelete={
                !archived && !published
              }
            />
          )}

          {currentPage === "competition" && (
            <Competition
              event={event}
              setEvent={setEvent}
            />
          )}

          {currentPage === "players" && (
              <Players
                players={players}
                setPlayers={handlePlayersChange}
                playerLimit={event.playerLimit}
              />
            )}

          {currentPage === "handicap" && (
              <HandicapUpdate
                players={players}
                setPlayers={handlePlayersChange}
              />
            )}

          {currentPage === "field" && (
              <FieldManagement
                event={event}
                players={players}
                onExportPrint={(data) => {
                  setDrawPreviewData(data);
                  setCurrentPage("drawPreview");
                }}
              />
            )}

          {currentPage === "catering" && (
              <Catering
                players={players}
              />
            )}

          {currentPage === "posters" && (
            <Posters
              event={event}
              attachedPosterIds={attachedPosterIds}
              onPreview={(posterId) => {

                setPreviewPosterId(
                  posterId
                );

                setCurrentPage(
                  "posterPreview"
                );
              }}
              onAttach={(posterIds) => {

                if (archived) {
                  setCurrentPage(
                    "reviewPublish"
                  );

                  return;
                }

                setAttachedPosterIds(posterIds);

                setCurrentPage("new");
              }}
            />
          )}

          {currentPage ===
            "drawPreview" &&
            drawPreviewData && (
            <DrawPreview
              event={event}
              data={drawPreviewData}
              onBack={() => {
                setDrawPreviewData(null);
                setCurrentPage("field");
              }}
            />
          )}

          {currentPage ===
            "posterPreview" && (
            <PosterPreview
              posterId={previewPosterId}
              onBack={() =>
                setCurrentPage(
                  "posters"
                )
              }
            />
          )}

          {currentPage ===
            "reviewPublish" && (
            <ReviewPublish
              event={event}
              players={players}
              attachedPosterId={
                attachedPosterId
              }
              published={
                isCurrentlyPublished
              }
              archived={archived}
              closeEligible={
                closeEligible
              }
              closeEligibleDate={
                closeEligibleDate
              }
              publicationMeta={
                publicationMeta
              }
              onPublish={
                handlePublish
              }
              onCloseArchive={
                handleCloseArchive
              }
              onNavigate={
                handleNavigate
              }
            />
          )}

          {currentPage === "eventOutput" && (
            <EventOutput
              event={event}
              players={players}
              published={isCurrentlyPublished}
              archived={archived}
              onBack={() =>
                setCurrentPage(
                  "reviewPublish"
                )
              }
            />
          )}

        </div>

      </main>

      <footer className="status">

        <span>
          Status:{" "}
          {archived
            ? "Archived"
            : isCurrentlyPublished
            ? "Published"
            : "Ready"}
        </span>

        <span>
          Version 1.0
        </span>

      </footer>

    </div>
  );
}