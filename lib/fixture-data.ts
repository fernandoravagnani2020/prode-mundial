// Fixture Mundial 2026 - basado en el sorteo del 5 de diciembre de 2024
// El admin puede sincronizar con la API para obtener fechas y resultados exactos

export interface MatchSeed {
  external_id: string;
  phase: string;
  group_name: string | null;
  team1: string;
  team2: string;
  team1_flag: string;
  team2_flag: string;
  match_date: string;
  venue: string | null;
}

const FLAGS: Record<string, string> = {
  Argentina: "🇦🇷", Brasil: "🇧🇷", Colombia: "🇨🇴", Ecuador: "🇪🇨",
  Uruguay: "🇺🇾", Paraguay: "🇵🇾", Chile: "🇨🇱", Venezuela: "🇻🇪",
  Bolivia: "🇧🇴", Peru: "🇵🇪", Perú: "🇵🇪",
  Francia: "🇫🇷", España: "🇪🇸", Alemania: "🇩🇪", Portugal: "🇵🇹",
  Inglaterra: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Países Bajos": "🇳🇱", Bélgica: "🇧🇪",
  Croacia: "🇭🇷", Polonia: "🇵🇱", Turquía: "🇹🇷", Austria: "🇦🇹",
  Suiza: "🇨🇭", Dinamarca: "🇩🇰", Serbia: "🇷🇸", Escocia: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  Italia: "🇮🇹", Ucrania: "🇺🇦", Hungría: "🇭🇺", Eslovenia: "🇸🇮",
  Eslovaquia: "🇸🇰", Rumania: "🇷🇴", Grecia: "🇬🇷",
  USA: "🇺🇸", México: "🇲🇽", Canada: "🇨🇦", Canadá: "🇨🇦", Panamá: "🇵🇦",
  "Costa Rica": "🇨🇷", Honduras: "🇭🇳", Jamaica: "🇯🇲",
  "Trinidad y Tobago": "🇹🇹",
  Marruecos: "🇲🇦", Senegal: "🇸🇳", Nigeria: "🇳🇬", Ghana: "🇬🇭",
  Camerún: "🇨🇲", Egipto: "🇪🇬", Argelia: "🇩🇿", "Costa de Marfil": "🇨🇮",
  Tanzania: "🇹🇿", Sudáfrica: "🇿🇦", Guinea: "🇬🇳", Angola: "🇦🇴",
  Japón: "🇯🇵", "Corea del Sur": "🇰🇷", Arabia: "🇸🇦", "Arabia Saudita": "🇸🇦",
  Australia: "🇦🇺", Irán: "🇮🇷", Irak: "🇮🇶", Indonesia: "🇮🇩",
  Uzbekistán: "🇺🇿", Jordania: "🇯🇴", Qatar: "🇶🇦",
  "Nueva Zelanda": "🇳🇿",
};

export function getFlag(team: string): string {
  return FLAGS[team] ?? "🏳️";
}

// Grupos según el sorteo del 5 de diciembre de 2024
// Fuente: FIFA. Los horarios son aproximados; sincronizar con la API para exactitud.
const GRUPOS: { grupo: string; equipos: [string, string, string, string]; fechas: [string, string, string] }[] = [
  { grupo: "A", equipos: ["USA", "Panamá", "Jamaica", "Honduras"],         fechas: ["2026-06-12T19:00:00", "2026-06-16T19:00:00", "2026-06-25T18:00:00"] },
  { grupo: "B", equipos: ["México", "Ecuador", "Venezuela", "Argelia"],    fechas: ["2026-06-12T22:00:00", "2026-06-16T22:00:00", "2026-06-25T21:00:00"] },
  { grupo: "C", equipos: ["Canadá", "Rumania", "Marruecos", "Bélgica"],   fechas: ["2026-06-13T19:00:00", "2026-06-17T19:00:00", "2026-06-26T18:00:00"] },
  { grupo: "D", equipos: ["Argentina", "Chile", "Perú", "Nueva Zelanda"],  fechas: ["2026-06-13T22:00:00", "2026-06-17T22:00:00", "2026-06-26T21:00:00"] },
  { grupo: "E", equipos: ["España", "Corea del Sur", "Colombia", "Costa de Marfil"], fechas: ["2026-06-14T19:00:00", "2026-06-18T19:00:00", "2026-06-27T18:00:00"] },
  { grupo: "F", equipos: ["Francia", "Polonia", "Paraguay", "Senegal"],   fechas: ["2026-06-14T22:00:00", "2026-06-18T22:00:00", "2026-06-27T21:00:00"] },
  { grupo: "G", equipos: ["Brasil", "Uruguay", "Austria", "Angola"],       fechas: ["2026-06-15T19:00:00", "2026-06-19T19:00:00", "2026-06-28T18:00:00"] },
  { grupo: "H", equipos: ["Portugal", "Serbia", "Costa Rica", "Nigeria"],  fechas: ["2026-06-15T22:00:00", "2026-06-19T22:00:00", "2026-06-28T21:00:00"] },
  { grupo: "I", equipos: ["Alemania", "Japón", "Bolivia", "Ghana"],        fechas: ["2026-06-16T15:00:00", "2026-06-20T19:00:00", "2026-06-29T18:00:00"] },
  { grupo: "J", equipos: ["Inglaterra", "Senegal", "Eslovaquia", "Camerún"], fechas: ["2026-06-16T15:00:00", "2026-06-20T22:00:00", "2026-06-29T21:00:00"] },
  { grupo: "K", equipos: ["Países Bajos", "Irán", "Ecuador", "Arabia"],    fechas: ["2026-06-17T15:00:00", "2026-06-21T19:00:00", "2026-06-30T18:00:00"] },
  { grupo: "L", equipos: ["Croacia", "Turquía", "Honduras", "Irak"],       fechas: ["2026-06-17T18:00:00", "2026-06-21T22:00:00", "2026-06-30T21:00:00"] },
];

function generarPartidosGrupo(
  grupo: string,
  equipos: [string, string, string, string],
  fechas: [string, string, string]
): MatchSeed[] {
  const [e1, e2, e3, e4] = equipos;
  return [
    // Fecha 1
    {
      external_id: `group-${grupo}-1`,
      phase: "group", group_name: `Grupo ${grupo}`,
      team1: e1, team2: e2, team1_flag: getFlag(e1), team2_flag: getFlag(e2),
      match_date: fechas[0], venue: null,
    },
    {
      external_id: `group-${grupo}-2`,
      phase: "group", group_name: `Grupo ${grupo}`,
      team1: e3, team2: e4, team1_flag: getFlag(e3), team2_flag: getFlag(e4),
      match_date: fechas[0], venue: null,
    },
    // Fecha 2
    {
      external_id: `group-${grupo}-3`,
      phase: "group", group_name: `Grupo ${grupo}`,
      team1: e1, team2: e3, team1_flag: getFlag(e1), team2_flag: getFlag(e3),
      match_date: fechas[1], venue: null,
    },
    {
      external_id: `group-${grupo}-4`,
      phase: "group", group_name: `Grupo ${grupo}`,
      team1: e2, team2: e4, team1_flag: getFlag(e2), team2_flag: getFlag(e4),
      match_date: fechas[1], venue: null,
    },
    // Fecha 3 (simultáneos)
    {
      external_id: `group-${grupo}-5`,
      phase: "group", group_name: `Grupo ${grupo}`,
      team1: e1, team2: e4, team1_flag: getFlag(e1), team2_flag: getFlag(e4),
      match_date: fechas[2], venue: null,
    },
    {
      external_id: `group-${grupo}-6`,
      phase: "group", group_name: `Grupo ${grupo}`,
      team1: e2, team2: e3, team1_flag: getFlag(e2), team2_flag: getFlag(e3),
      match_date: fechas[2], venue: null,
    },
  ];
}

export const FIXTURE_MUNDIAL_2026: MatchSeed[] = [
  ...GRUPOS.flatMap(({ grupo, equipos, fechas }) =>
    generarPartidosGrupo(grupo, equipos, fechas)
  ),
  // Ronda de 32 — equipos TBD hasta que termine la fase de grupos
  ...Array.from({ length: 16 }, (_, i) => ({
    external_id: `r32-${i + 1}`,
    phase: "r32",
    group_name: null,
    team1: "Por definir",
    team2: "Por definir",
    team1_flag: "🏳️",
    team2_flag: "🏳️",
    match_date: `2026-07-0${Math.floor(i / 4) + 3}T19:00:00`,
    venue: null,
  })),
  // Octavos de Final (8 partidos)
  ...Array.from({ length: 8 }, (_, i) => ({
    external_id: `r16-${i + 1}`,
    phase: "r16",
    group_name: null,
    team1: "Por definir",
    team2: "Por definir",
    team1_flag: "🏳️",
    team2_flag: "🏳️",
    match_date: `2026-07-${10 + Math.floor(i / 2)}T19:00:00`,
    venue: null,
  })),
  // Cuartos de Final (4 partidos)
  ...Array.from({ length: 4 }, (_, i) => ({
    external_id: `qf-${i + 1}`,
    phase: "qf",
    group_name: null,
    team1: "Por definir",
    team2: "Por definir",
    team1_flag: "🏳️",
    team2_flag: "🏳️",
    match_date: `2026-07-${14 + i}T19:00:00`,
    venue: null,
  })),
  // Semifinales
  { external_id: "sf-1", phase: "sf", group_name: null, team1: "Por definir", team2: "Por definir", team1_flag: "🏳️", team2_flag: "🏳️", match_date: "2026-07-18T19:00:00", venue: null },
  { external_id: "sf-2", phase: "sf", group_name: null, team1: "Por definir", team2: "Por definir", team1_flag: "🏳️", team2_flag: "🏳️", match_date: "2026-07-19T19:00:00", venue: null },
  // Final
  { external_id: "final", phase: "f", group_name: null, team1: "Por definir", team2: "Por definir", team1_flag: "🏳️", team2_flag: "🏳️", match_date: "2026-07-19T15:00:00", venue: "MetLife Stadium, Nueva Jersey" },
];
