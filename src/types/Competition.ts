/**
 * ============================================================
 * EVENT DESK
 * Competition Master Data Model
 * Version 1.0
 * ============================================================
 *
 * This file defines the core Competition object used
 * throughout the Event Desk application.
 *
 * Every competition references reusable libraries wherever
 * possible rather than duplicating information.
 */

export interface Competition {
  id: string;
  name: string;

  created: Date;
  lastModified: Date;

  isArchived: boolean;

  basic: CompetitionBasicDetails;
  playingFormat: CompetitionPlayingFormat;
  catering: CompetitionCatering;
  registration: CompetitionRegistration;
  prizes: CompetitionPrizes;
  documents: CompetitionDocuments;
  results: CompetitionResults;
  administration: CompetitionAdministration;
}

/* ============================================================
   BASIC DETAILS
============================================================ */

export interface CompetitionBasicDetails {
  competitionType: string;

  venue: string;
  course: string;

  organiser: string;

  eventDate: string;

  firstTeeTime: string;
  lastTeeTime: string;
  teeIntervalMinutes: number;

  entryFee: number;

  maximumPlayers: number;

  status:
    | "Draft"
    | "Open"
    | "Closed"
    | "Completed";
}

/* ============================================================
   PLAYING FORMAT
============================================================ */

export interface CompetitionPlayingFormat {
  formatName: string;

  description: string;

  teamSize: number;

  scoringMethod: string;

  handicapMethod: string;

  specialRules: string[];

  defaultNotes: string;
}

/* ============================================================
   CATERING
============================================================ */

export interface CompetitionCatering {
  teaCoffee: boolean;

  breakfast: boolean;

  lunch: boolean;

  eveningMeal: boolean;

  creamTea: boolean;

  buffet: boolean;

  snacks: boolean;

  other: boolean;

  packageName: string;

  packageNotes: string;
}

/* ============================================================
   REGISTRATION
============================================================ */

export interface CompetitionRegistration {
  registrationOpens: string;

  registrationCloses: string;

  onlineRegistration: boolean;

  paymentRequired: boolean;

  waitingListEnabled: boolean;
}

/* ============================================================
   PRIZES
============================================================ */

export interface CompetitionPrizes {
  prizePackage: string;

  nearestThePin: boolean;

  longestDrive: boolean;

  twosCompetition: boolean;

  beatThePro: boolean;

  holeInOne: boolean;
}

/* ============================================================
   DOCUMENTS
============================================================ */

export interface CompetitionDocuments {
  posterTemplate: string;

  playerPackTemplate: string;

  registrationTemplate: string;

  rulesDocument: string;
}

/* ============================================================
   RESULTS
============================================================ */

export interface CompetitionResults {
  winningScore: string;

  winningPlayerOrTeam: string;

  resultsPublished: boolean;
}

/* ============================================================
   ADMINISTRATION
============================================================ */

export interface CompetitionAdministration {
  notes: string;

  internalComments: string;
}