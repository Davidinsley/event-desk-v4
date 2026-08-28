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

  teeColour: string;

  competitionRules: string;

  status?: EventStatus;
}