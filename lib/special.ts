// Predicciones especiales — concurso de los $250.000
// Cierra el 17 de junio de 2026 a la medianoche (hora Argentina, UTC-3)
export const SPECIAL_DEADLINE = new Date("2026-06-17T23:59:59-03:00");
export const SPECIAL_PRIZE = "$250.000";

export function isSpecialOpen(now: Date = new Date()): boolean {
  return now.getTime() <= SPECIAL_DEADLINE.getTime();
}

export type SpecialFieldType = "team" | "text";

export interface SpecialField {
  key: string;
  label: string;
  type: SpecialFieldType;
  icon: string;
  placeholder?: string;
}

export const SPECIAL_FIELDS: SpecialField[] = [
  { key: "champion", label: "Campeón", type: "team", icon: "🏆" },
  { key: "runner_up", label: "Subcampeón", type: "team", icon: "🥈" },
  { key: "third", label: "Tercer puesto", type: "team", icon: "🥉" },
  { key: "fourth", label: "Cuarto puesto", type: "team", icon: "🏅" },
  { key: "best_player", label: "Mejor jugador", type: "text", icon: "⭐", placeholder: "Ej: Lionel Messi" },
  { key: "best_goalkeeper", label: "Mejor arquero", type: "text", icon: "🧤", placeholder: "Ej: Emiliano Martínez" },
  { key: "young_star", label: "Estrella joven", type: "text", icon: "🌟", placeholder: "Ej: Lamine Yamal" },
];

export const SPECIAL_KEYS = SPECIAL_FIELDS.map((f) => f.key);

export type SpecialPrediction = Record<string, string | null>;
