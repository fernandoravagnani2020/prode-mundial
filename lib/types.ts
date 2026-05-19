export interface User {
  dni: string;
  name: string;
  is_admin: number;
  created_at: string;
}

export interface Match {
  id: number;
  external_id: string | null;
  phase: "group" | "r32" | "r16" | "qf" | "sf" | "f";
  group_name: string | null;
  team1: string;
  team2: string;
  team1_flag: string;
  team2_flag: string;
  match_date: string;
  venue: string | null;
  score1: number | null;
  score2: number | null;
  status: "scheduled" | "live" | "finished";
}

export interface Prediction {
  id: number;
  user_dni: string;
  match_id: number;
  predicted_score1: number;
  predicted_score2: number;
  points: number | null;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  dni: string;
  name: string;
  points: number;
  exact: number;
  partial: number;
  wrong: number;
  total_predictions: number;
}

export interface Session {
  dni: string;
  name: string;
  isAdmin: boolean;
}

export const ADMIN_DNIS = ["27674015", "32771753", "42162227"] as const;

export const PHASE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  r32: "Ronda de 32",
  r16: "Octavos de Final",
  qf: "Cuartos de Final",
  sf: "Semifinal",
  f: "Final",
};
