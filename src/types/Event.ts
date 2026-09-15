// Event.ts

export type EventStatus =
  | "draft"
  | "confirmed"
  | "published"
  | "archived";

export interface Event {
  eventNumber: string;

  eventName: string;

  eventDate: string;

  venue: string;

  competition: string;

  entryFee: number;

  playerLimit: number;

  competitionCategory: string;

  competitionFormat: string;

  competitionRounds: number;

  handicapAllowance: number;

  // Optional competition handicap-cap settings.
  // Optional fields preserve compatibility with existing saved events.
  applyHandicapCaps?: boolean;
  maleMaxHI?: number;
  femaleMaxHI?: number;

  // Existing tee colour retained as the men's tee colour for compatibility.
  teeColour: string;

  // Optional so existing saved events remain compatible.
  ladiesTeeColour?: string;

  competitionRules: string;

  status?: EventStatus;
}