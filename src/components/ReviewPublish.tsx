import type { Event } from "../types/Event";
import type { Player } from "../types/Player";

import "./ReviewPublish.css";

import PageLayout from "../layout/PageLayout";

import {
  CheckCircle,
  AlertCircle,
  CalendarDays,
  Trophy,
  Image,
  Send,
  Printer,
  Lock,
} from "lucide-react";

interface PublicationMeta {
  publicationCount: number;
  firstPublishedAt: string | null;
  lastPublishedAt: string | null;
}

interface ReviewPublishProps {
  event: Event;
  players: Player[];
  attachedPosterId: string | null;
  published: boolean;
  archived: boolean;
  closeEligible: boolean;
  closeEligibleDate: Date | null;
  publicationMeta: PublicationMeta;
  onPublish: () => void;
  onCloseArchive: () => void;
  onNavigate: (page: string) => void;
}

interface ReviewItem {
  title: string;
  description: string;
  complete: boolean;
  icon: typeof CalendarDays;
  page: string;
}

export default function ReviewPublish({
  event,
  players,
  attachedPosterId,
  published,
  archived,
  closeEligible,
  closeEligibleDate,
  publicationMeta,
  onPublish,
  onCloseArchive,
  onNavigate,
}: ReviewPublishProps) {
  const eventDetailsComplete =
    event.eventName.trim() !== "" &&
    event.eventDate.trim() !== "" &&
    event.venue.trim() !== "";

  const competitionComplete =
    event.competition.trim() !== "";

  const posterComplete =
    attachedPosterId !== null;

  const reviewItems: ReviewItem[] = [
    {
      title: "Event Details",
      description: eventDetailsComplete
        ? "Event name, date and venue are complete."
        : "Event name, date and venue must be completed.",
      complete: eventDetailsComplete,
      icon: CalendarDays,
      page: "new",
    },
    {
      title: "Competition",
      description: competitionComplete
        ? "Competition format has been selected."
        : "A competition format is required.",
      complete: competitionComplete,
      icon: Trophy,
      page: "competition",
    },
    {
      title: "Players",
      description:
        players.length > 0
          ? `${players.length} player${
              players.length === 1 ? "" : "s"
            } currently entered. Player entry can continue after publication.`
          : "No players entered yet. Player entry can be completed later.",
      complete: true,
      icon: CalendarDays,
      page: "players",
    },
    {
      title: "Poster",
      description: posterComplete
        ? "A poster is attached to this event."
        : "A poster must be attached before publishing.",
      complete: posterComplete,
      icon: Image,
      page: "posters",
    },
  ];

  const completedItems =
    reviewItems.filter(
      (item) => item.complete
    ).length;

  const totalItems =
    reviewItems.length;

  const completionPercentage =
    Math.round(
      (completedItems / totalItems) * 100
    );

  const readyToPublish =
    completedItems === totalItems;

  /*
   * If there has been at least one previous publication
   * but the current version is no longer published, the
   * event has been amended and requires republishing.
   */
  const hasPendingChanges =
    !published &&
    publicationMeta.publicationCount > 0 &&
    !archived;

  const hasNeverBeenPublished =
    publicationMeta.publicationCount === 0 &&
    !archived;

  /*
   * The event can only be closed when:
   *
   * 1. It is currently published
   * 2. The five-day waiting period has passed
   * 3. There are no pending amendments
   */
  const canCloseArchive =
    published &&
    closeEligible &&
    !hasPendingChanges &&
    !archived;

  const handlePublishClick = () => {
    if (
      !readyToPublish ||
      published ||
      archived
    ) {
      return;
    }

    onPublish();
  };

  const formattedCloseDate =
    closeEligibleDate
      ? closeEligibleDate.toLocaleDateString(
          "en-GB",
          {
            day: "numeric",
            month: "long",
            year: "numeric",
          }
        )
      : null;

  return (
    <PageLayout title="Review & Publish">

      <div className="review-publish-page">

        {/* PUBLICATION STATUS */}

        <div
          className={
            archived
              ? "publish-status archived"
              : published
              ? "publish-status ready"
              : readyToPublish
              ? "publish-status ready"
              : "publish-status incomplete"
          }
        >

          {archived ? (
            <Lock size={30} />
          ) : published ||
            readyToPublish ? (
            <CheckCircle size={30} />
          ) : (
            <AlertCircle size={30} />
          )}

          <div>

            <h2>
              {archived
                ? "Event Closed & Archived"
                : published
                ? "Event Published"
                : hasPendingChanges
                ? "Changes Awaiting Republish"
                : readyToPublish
                ? "Event Ready to Publish"
                : "Event Not Ready to Publish"}
            </h2>

            <p>
              {archived
                ? "This event is now a read-only historical record."
                : published
                ? "This is the current published version of the event."
                : hasPendingChanges
                ? "Changes have been made since the last publication and must be republished."
                : readyToPublish
                ? "All current checks have been completed."
                : `${totalItems - completedItems} item${
                    totalItems - completedItems === 1
                      ? ""
                      : "s"
                  } still require attention.`}
            </p>

          </div>

        </div>


        {/* EVENT SUMMARY */}

        <div className="review-event-card">

          <div className="review-event-heading">

            <div>

              <h2>
                {event.eventName ||
                  "Unnamed Event"}
              </h2>

              <p>
                {event.competition ||
                  "Competition not selected"}
              </p>

            </div>

            <div className="event-number">
              Event {event.eventNumber}
            </div>

          </div>


          <div className="event-overview-grid">

            <div>
              <span>DATE</span>

              <strong>
                {event.eventDate ||
                  "Not Set"}
              </strong>
            </div>

            <div>
              <span>VENUE</span>

              <strong>
                {event.venue ||
                  "Not Set"}
              </strong>
            </div>

            <div>
              <span>ENTRY FEE</span>

              <strong>
                £{event.entryFee.toFixed(2)}
              </strong>
            </div>

            <div>
              <span>PLAYER LIMIT</span>

              <strong>
                {event.playerLimit}
              </strong>
            </div>

          </div>

        </div>


        {/* PRE-PUBLISH CHECKS */}

        <div className="review-section">

          <div className="review-section-header">

            <div>

              <h2>
                {archived
                  ? "Event Record"
                  : "Pre-Publish Checks"}
              </h2>

              <p>
                {archived
                  ? "This archived event is read-only."
                  : "Complete each section before publishing the event."}
              </p>

            </div>

            <div className="completion-badge">
              {archived
                ? "LOCKED"
                : published
                ? "100%"
                : `${completionPercentage}%`}
            </div>

          </div>


          <div className="review-check-list">

            {reviewItems.map((item) => {

              const Icon = item.icon;

              return (

                <div
                  key={item.title}
                  className={
                    item.complete
                      ? "review-check complete review-check-clickable"
                      : "review-check incomplete review-check-clickable"
                  }
                  onClick={() =>
                    onNavigate(item.page)
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {

                    if (
                      e.key === "Enter" ||
                      e.key === " "
                    ) {

                      e.preventDefault();

                      onNavigate(item.page);

                    }

                  }}
                >

                  <div className="review-check-icon">
                    <Icon size={24} />
                  </div>

                  <div className="review-check-content">

                    <h3>
                      {item.title}
                    </h3>

                    <p>
                      {item.description}
                    </p>

                  </div>

                  <div className="review-check-status">

                    {item.complete ? (
                      <>
                        <CheckCircle size={22} />

                        <span>
                          Complete
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={22} />

                        <span>
                          Attention
                        </span>
                      </>
                    )}

                  </div>

                </div>

              );

            })}

          </div>

        </div>


        {/* PUBLICATION */}

        {!archived && (

          <div className="publish-footer-panel">

            <div>

              <h2>
                Final Publication
              </h2>

              <div
                style={{
                  marginTop: "8px",
                  marginBottom: "8px",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: hasPendingChanges ? "#c2410c" : "#15803d",
                }}
              >
                Current Status: {hasPendingChanges ? "Draft" : "Published"}
              </div>

              <p>
                {published
                  ? "Changes can be made at any time and republished as required."
                  : hasPendingChanges
                  ? "Changes have been made since the previous publication and must now be republished."
                  : "Publishing will make this version the official event record."}
              </p>

              {publicationMeta.publicationCount >
                0 && (

                <p className="publication-history">

                  Published{" "}
                  {publicationMeta.publicationCount} time
                  {publicationMeta.publicationCount ===
                  1
                    ? ""
                    : "s"}

                  {publicationMeta.lastPublishedAt
                    ? ` • Last publication ${new Date(
                        publicationMeta.lastPublishedAt
                      ).toLocaleDateString(
                        "en-GB"
                      )}`
                    : ""}

                </p>

              )}

            </div>


            <button
              type="button"
              className="publish-button"
              disabled={
                !readyToPublish ||
                published
              }
              onClick={handlePublishClick}
            >

              <Send size={20} />

              {published
                ? "Published"
                : hasPendingChanges
                ? "Republish Event"
                : "Publish Event"}

            </button>

          </div>

        )}


        {/* EVENT OUTPUTS */}

        <div className="event-output-panel">

          <div className="event-output-heading">

            <div>

              <h2>
                Event Outputs
              </h2>

              <p>
                {archived
                  ? "Create an output from the archived event record."
                  : published
                  ? "Create an output from the current official event record."
                  : "Preview the current event information before publication."}
              </p>

            </div>

            {(published || archived) && (

              <div className="published-output-badge">

                {archived
                  ? "Archived Version"
                  : "Published Version"}

              </div>

            )}

          </div>


          <div className="event-output-actions">

            <button
              type="button"
              className="output-button"
              onClick={() =>
                onNavigate("eventOutput")
              }
            >

              <Printer size={21} />

              <span>

                <strong>
                  Print Event
                </strong>

                <small>
                  Preview the printable event record
                </small>

              </span>

            </button>



          </div>


        </div>


        {/* CLOSE & ARCHIVE */}

        {archived ? (

          <div className="archive-panel archived-panel">

            <div className="archive-panel-icon">
              <Lock size={24} />
            </div>

            <div className="archive-panel-content">

              <h2>
                Closed & Archived
              </h2>

              <p>
                This event is permanently locked as
                a reference record. It can no longer
                be edited or republished.
              </p>

              <div className="archive-meta">

                <span>
                  Final publication count:
                  {" "}
                  {publicationMeta.publicationCount}
                </span>

                <span>
                  Archived:{" "}
                  {new Date().toLocaleDateString(
                    "en-GB"
                  )}
                </span>

              </div>

            </div>

          </div>

        ) : (

          <div className="archive-panel">

            <div className="archive-panel-icon">
              <Lock size={24} />
            </div>

            <div className="archive-panel-content">

              <h2>
                Close & Archive Event
              </h2>

              <p>
                Closing the event will make the final
                published version permanently read-only
                and move it into the event archive.
              </p>


              {hasNeverBeenPublished ? (

                <div className="archive-warning">

                  <AlertCircle size={18} />

                  <span>
                    The event must be published before
                    it can be closed and archived.
                  </span>

                </div>

              ) : hasPendingChanges ? (

                <div className="archive-warning">

                  <AlertCircle size={18} />

                  <span>
                    Changes have been made since the
                    previous publication. Republish the
                    event before it can be closed and archived.
                  </span>

                </div>

              ) : !closeEligible ? (

                <div className="archive-warning">

                  <CalendarDays size={18} />

                  <span>
                    Close & Archive becomes available
                    {formattedCloseDate
                      ? ` on ${formattedCloseDate}`
                      : " five days after the event."}
                  </span>

                </div>

              ) : (

                <div className="archive-ready">

                  <CheckCircle size={18} />

                  <span>
                    This event is now eligible to be
                    closed and archived.
                  </span>

                </div>

              )}

            </div>


            <button
              type="button"
              className="archive-button"
              disabled={!canCloseArchive}
              onClick={onCloseArchive}
            >

              <Lock size={19} />

              Close & Archive

            </button>

          </div>

        )}

      </div>

    </PageLayout>
  );
}