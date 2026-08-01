/**
 * ============================================================
 * EVENT DESK
 * Player Master Data Model
 * Version 2.0
 * ============================================================
 */

export interface Player {
  id: string;

  firstName: string;
  lastName: string;

  handicapIndex: number;

  status: "Registered" | "Waiting";

  source: "Manual" | "CSV" | "Excel" | "Start List";

  paid: boolean;

  notes: string;

  // -----------------------------
  // Event Assignment
  // -----------------------------

  team?: number;

  teeTime?: string;

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