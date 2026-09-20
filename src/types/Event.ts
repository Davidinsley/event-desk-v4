// Event.ts

export type EventStatus =
  | "draft"
  | "confirmed"
  | "published"
  | "archived";

export type PrizeStream =
  | "main"
  | "additional"
  | "onCourse"
  | "special";

export type PrizeSource =
  | "Section"
  | "Comp Fees"
  | "Sponsor"
  | "Donation";

export interface EventPrize {
  id: string;
  stream: PrizeStream;
  title: string;
  description: string;
  source: PrizeSource;
  sourceName?: string;
  value?: number;
  hole?: string;
  winner?: string;
}

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

  // Optional so existing saved events remain compatible.
  // Prizes belong to the individual event.
  prizes?: EventPrize[];

  // Optional Prize Winners publication settings.
  // Optional fields preserve compatibility with existing saved events.
  prizeWinnersUseBespokeMessage?: boolean;
  prizeWinnersPublicationMessage?: string;

  // Optional so all existing saved events remain compatible.
  // When true, this event is shown as the Priority Event.
  priority?: boolean;

  status?: EventStatus;
}
