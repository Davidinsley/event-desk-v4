/**
 * ============================================================
 * EVENT DESK
 * Player Master Data Model
 * Version 2.1
 * ============================================================
 */

export interface Player {
  id: string;

  firstName: string;
  lastName: string;

  handicapIndex: number;

  // Optional so existing saved player records remain compatible.
  gender?: "Male" | "Female";

  status: "Registered" | "Waiting";

  source: "Manual" | "CSV" | "Excel" | "Start List";

  paid: boolean;

  notes: string;

  // Optional dietary requirement flag used by Players and Catering.
  dietaryNeed?: boolean;

  // -----------------------------
  // Player / Start List Data
  // -----------------------------

  team?: number;

  teeTime?: string;

  group?: string;

  homeClub?: string;

  startingHole?: number;

  // -----------------------------
  // Event Status
  // -----------------------------

  checkedIn?: boolean;

  withdrawn?: boolean;

  // -----------------------------
  // Administration
  // -----------------------------

  locked?: boolean;
}
