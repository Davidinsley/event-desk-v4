/**
 * ============================================================
 * EVENT DESK
 * Player Master Data Model
 * Version 1.0
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
}