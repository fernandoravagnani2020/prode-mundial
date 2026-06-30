import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbBatch, dbRun } from "@/lib/db";
import { ADMIN_DNIS } from "@/lib/types";
import { FIXTURE_MUNDIAL_2026 } from "@/lib/fixture-data";
import { calculatePoints } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  const { dni } = await req.json();
  if (!(ADMIN_DNIS as readonly string[]).includes(dni)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const apiKey = process.env.FOOTBALL_API_KEY;
  return apiKey ? syncFromApi(apiKey) : seedFromLocal();
}

async function syncFromApi(apiKey: string) {
  try {
    const res = await fetch(
      "https://api.football-data.org/v4/competitions/2000/matches",
      { headers: { "X-Auth-Token": apiKey } }
    );
    if (!res.ok) return seedFromLocal();

    const data = await res.json();

    const PHASE_MAP: Record<string, string> = {
      GROUP_STAGE: "group",
      ROUND_OF_32: "r32", LAST_32: "r32",
      ROUND_OF_16: "r16", LAST_16: "r16",
      QUARTER_FINALS: "qf", LAST_8: "qf",
      SEMI_FINALS: "sf", LAST_4: "sf",
      THIRD_PLACE: "3p",
      FINAL: "f", LAST_2: "f",
    };
    const FLAG_MAP: Record<string, string> = {
      // CONMEBOL
      ARG: "🇦🇷", BRA: "🇧🇷", COL: "🇨🇴", ECU: "🇪🇨", URU: "🇺🇾", URY: "🇺🇾",
      PAR: "🇵🇾", CHI: "🇨🇱", VEN: "🇻🇪", BOL: "🇧🇴", PER: "🇵🇪",
      // UEFA
      FRA: "🇫🇷", ESP: "🇪🇸", GER: "🇩🇪", POR: "🇵🇹", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      NED: "🇳🇱", BEL: "🇧🇪", CRO: "🇭🇷", POL: "🇵🇱", TUR: "🇹🇷",
      SRB: "🇷🇸", SUI: "🇨🇭", DEN: "🇩🇰", ROU: "🇷🇴", SVK: "🇸🇰",
      AUT: "🇦🇹", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", ITA: "🇮🇹", UKR: "🇺🇦", HUN: "🇭🇺",
      SVN: "🇸🇮", GRE: "🇬🇷", WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", CZE: "🇨🇿", NOR: "🇳🇴",
      FIN: "🇫🇮", ISL: "🇮🇸", ALB: "🇦🇱", BIH: "🇧🇦",
      // CONCACAF
      USA: "🇺🇸", MEX: "🇲🇽", CAN: "🇨🇦", PAN: "🇵🇦", CRC: "🇨🇷",
      HON: "🇭🇳", JAM: "🇯🇲", TTO: "🇹🇹", SLV: "🇸🇻", HAI: "🇭🇹",
      CUW: "🇨🇼", CUR: "🇨🇼", GUA: "🇬🇹", NCA: "🇳🇮", BLZ: "🇧🇿",
      // CAF
      MAR: "🇲🇦", SEN: "🇸🇳", NGA: "🇳🇬", GHA: "🇬🇭", CMR: "🇨🇲",
      EGY: "🇪🇬", ALG: "🇩🇿", CIV: "🇨🇮", TUN: "🇹🇳", TAN: "🇹🇿",
      RSA: "🇿🇦", GUI: "🇬🇳", ANG: "🇦🇴", CPV: "🇨🇻", MLI: "🇲🇱",
      BFA: "🇧🇫", ZIM: "🇿🇼", UGA: "🇺🇬", MOZ: "🇲🇿", NAM: "🇳🇦",
      COD: "🇨🇩", GAB: "🇬🇦", LBA: "🇱🇾", SUD: "🇸🇩",
      // AFC
      JPN: "🇯🇵", KOR: "🇰🇷", SAU: "🇸🇦", KSA: "🇸🇦", AUS: "🇦🇺",
      IRI: "🇮🇷", IRN: "🇮🇷", IRQ: "🇮🇶", IDN: "🇮🇩", UZB: "🇺🇿",
      JOR: "🇯🇴", QAT: "🇶🇦", CHN: "🇨🇳", KUW: "🇰🇼", BHR: "🇧🇭",
      OMA: "🇴🇲", UAE: "🇦🇪", KGZ: "🇰🇬", TJK: "🇹🇯", PAL: "🇵🇸",
      SYR: "🇸🇾", LIB: "🇱🇧",
      // OFC
      NZL: "🇳🇿",
    };
    const STATUS_MAP: Record<string, string> = {
      SCHEDULED: "scheduled", TIMED: "scheduled", LIVE: "live",
      IN_PLAY: "live", FINISHED: "finished",
    };

    const matches = data.matches ?? [];
    const statements = matches.map((m: Record<string, unknown>) => {
      const homeCode = (m.homeTeam as Record<string, string>)?.tla ?? "";
      const awayCode = (m.awayTeam as Record<string, string>)?.tla ?? "";
      const score = m.score as Record<string, unknown> | undefined;
      const duration = score?.duration as string | undefined;
      const fullTime = score?.fullTime as Record<string, number | null> | undefined;
      const regularTime = score?.regularTime as Record<string, number | null> | undefined;
      const extraTime = score?.extraTime as Record<string, number | null> | undefined;
      const penalties = score?.penalties as Record<string, number | null> | undefined;

      // Marcador del prode: resultado EN CANCHA (tiempo regular + alargue),
      // SIN los penales. La API suma todo en `fullTime` (ej: 1-1 que se define
      // 4-2 por penales aparece como 5-3), así que en eliminatorias reconstruimos
      // el marcador desde regularTime + extraTime. Si la API no envía esos campos
      // (partidos normales decididos en los 90'), usamos fullTime directo.
      const decidedAfter90 =
        duration === "PENALTY_SHOOTOUT" || duration === "EXTRA_TIME";
      const hasSplit = regularTime != null || extraTime != null;
      let score1: number | null;
      let score2: number | null;
      if (decidedAfter90 && hasSplit) {
        score1 = (regularTime?.home ?? 0) + (extraTime?.home ?? 0);
        score2 = (regularTime?.away ?? 0) + (extraTime?.away ?? 0);
      } else {
        score1 = fullTime?.home ?? null;
        score2 = fullTime?.away ?? null;
      }

      // Clasificado: el ganador que informa la API. Si fue por penales y la API
      // no marca winner, lo derivamos del marcador de la tanda.
      const apiWinner = score?.winner as string | null | undefined;
      let winnerTeam =
        apiWinner === "HOME_TEAM" ? "team1" : apiWinner === "AWAY_TEAM" ? "team2" : null;
      if (!winnerTeam && duration === "PENALTY_SHOOTOUT") {
        const ph = penalties?.home ?? 0;
        const pa = penalties?.away ?? 0;
        if (ph !== pa) {
          winnerTeam = ph > pa ? "team1" : "team2";
        } else {
          // El campo `penalties` puede venir vacío/empatado. Como en cancha fue
          // empate, el que tenga más en `fullTime` (que suma la tanda) ganó.
          const fh = fullTime?.home ?? 0;
          const fa = fullTime?.away ?? 0;
          if (fh > fa) winnerTeam = "team1";
          else if (fa > fh) winnerTeam = "team2";
        }
      }
      return {
        sql: `INSERT INTO matches (external_id, phase, group_name, team1, team2, team1_flag, team2_flag, match_date, venue, score1, score2, winner_team, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(external_id) DO UPDATE SET
                phase = excluded.phase, group_name = excluded.group_name,
                team1 = excluded.team1, team2 = excluded.team2,
                team1_flag = excluded.team1_flag, team2_flag = excluded.team2_flag,
                match_date = excluded.match_date, venue = excluded.venue,
                score1 = excluded.score1, score2 = excluded.score2,
                winner_team = excluded.winner_team,
                status = excluded.status`,
        args: [
          String(m.id),
          PHASE_MAP[m.stage as string] ?? "group",
          m.group ? `Grupo ${(m.group as string).replace("GROUP_", "")}` : null,
          (m.homeTeam as Record<string, string>)?.name ?? "Por definir",
          (m.awayTeam as Record<string, string>)?.name ?? "Por definir",
          FLAG_MAP[homeCode] ?? "🏳️",
          FLAG_MAP[awayCode] ?? "🏳️",
          (m.utcDate as string) ?? new Date().toISOString(),
          (m.venue as string) ?? null,
          score1,
          score2,
          winnerTeam,
          STATUS_MAP[m.status as string] ?? "scheduled",
        ],
      };
    });

    await dbBatch(statements);
    await recalcularPuntos();

    return NextResponse.json({ success: true, synced: matches.length, source: "api" });
  } catch {
    return seedFromLocal();
  }
}

async function seedFromLocal() {
  const statements = FIXTURE_MUNDIAL_2026.map((m) => ({
    sql: `INSERT INTO matches
            (external_id, phase, group_name, team1, team2, team1_flag, team2_flag, match_date, venue)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(external_id) DO UPDATE SET
            team1_flag = excluded.team1_flag,
            team2_flag = excluded.team2_flag`,
    args: [m.external_id, m.phase, m.group_name, m.team1, m.team2, m.team1_flag, m.team2_flag, m.match_date, m.venue ?? null],
  }));

  await dbBatch(statements);
  return NextResponse.json({ success: true, synced: FIXTURE_MUNDIAL_2026.length, source: "local" });
}

async function recalcularPuntos() {
  const matches = await dbAll<{ id: number; score1: number; score2: number; winner_team: string | null }>(
    "SELECT id, score1, score2, winner_team FROM matches WHERE score1 IS NOT NULL AND score2 IS NOT NULL"
  );

  for (const m of matches) {
    const preds = await dbAll<{ id: number; predicted_score1: number; predicted_score2: number; predicted_advancer: string | null }>(
      "SELECT id, predicted_score1, predicted_score2, predicted_advancer FROM predictions WHERE match_id = ?", [m.id]
    );
    if (preds.length) {
      await dbBatch(preds.map((p) => ({
        sql: "UPDATE predictions SET points = ? WHERE id = ?",
        args: [
          calculatePoints(p.predicted_score1, p.predicted_score2, m.score1, m.score2, {
            predictedAdvancer: p.predicted_advancer,
            actualAdvancer: m.winner_team,
          }),
          p.id,
        ],
      })));
    }
  }
}
