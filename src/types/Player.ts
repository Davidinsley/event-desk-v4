export interface Player {
  id: string;

  firstName: string;
  lastName: string;

  handicapIndex: number;

  paid: boolean;

  status: "Registered" | "Waiting";

  source: "Manual" | "CSV" | "Excel" | "Start List";

  notes: string;
}