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
      GROUP_STAGE: "group", ROUND_OF_32: "r32", ROUND_OF_16: "r16",
      QUARTER_FINALS: "qf", SEMI_FINALS: "sf", FINAL: "f",
    };
    const FLAG_MAP: Record<string, string> = {
      ARG: "🇦🇷", BRA: "🇧🇷", FRA: "🇫🇷", ESP: "🇪🇸", GER: "🇩🇪",
      ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", POR: "🇵🇹", NED: "🇳🇱", BEL: "🇧🇪", CRO: "🇭🇷",
      USA: "🇺🇸", MEX: "🇲🇽", CAN: "🇨🇦", MAR: "🇲🇦", SEN: "🇸🇳",
      JPN: "🇯🇵", KOR: "🇰🇷", AUS: "🇦🇺", COL: "🇨🇴", ECU: "🇪🇨",
      URU: "🇺🇾", PAR: "🇵🇾", CHI: "🇨🇱", PER: "🇵🇪", VEN: "🇻🇪",
      BOL: "🇧🇴", PAN: "🇵🇦", JAM: "🇯🇲", POL: "🇵🇱", TUR: "🇹🇷",
      SRB: "🇷🇸", IRI: "🇮🇷", IRQ: "🇮🇶", NGA: "🇳🇬", GHA: "🇬🇭",
      CMR: "🇨🇲", CIV: "🇨🇮", SAU: "🇸🇦", IDN: "🇮🇩",
    };
    const STATUS_MAP: Record<string, string> = {
      SCHEDULED: "scheduled", TIMED: "scheduled", LIVE: "live",
      IN_PLAY: "live", FINISHED: "finished",
    };

    const matches = data.matches ?? [];
    const statements = matches.map((m: Record<string, unknown>) => {
      const homeCode = (m.homeTeam as Record<string, string>)?.tla ?? "";
      const awayCode = (m.awayTeam as Record<string, string>)?.tla ?? "";
      const score = m.score as Record<string, Record<string, number | null>> | undefined;
      return {
        sql: `INSERT INTO matches (external_id, phase, group_name, team1, team2, team1_flag, team2_flag, match_date, venue, score1, score2, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(external_id) DO UPDATE SET
                team1 = excluded.team1, team2 = excluded.team2,
                team1_flag = excluded.team1_flag, team2_flag = excluded.team2_flag,
                match_date = excluded.match_date, venue = excluded.venue,
                score1 = excluded.score1, score2 = excluded.score2,
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
          score?.fullTime?.home ?? null,
          score?.fullTime?.away ?? null,
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
    sql: `INSERT OR IGNORE INTO matches
            (external_id, phase, group_name, team1, team2, team1_flag, team2_flag, match_date, venue)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [m.external_id, m.phase, m.group_name, m.team1, m.team2, m.team1_flag, m.team2_flag, m.match_date, m.venue ?? null],
  }));

  await dbBatch(statements);
  return NextResponse.json({ success: true, synced: FIXTURE_MUNDIAL_2026.length, source: "local" });
}

async function recalcularPuntos() {
  const matches = await dbAll<{ id: number; score1: number; score2: number }>(
    "SELECT id, score1, score2 FROM matches WHERE score1 IS NOT NULL AND score2 IS NOT NULL"
  );

  for (const m of matches) {
    const preds = await dbAll<{ id: number; predicted_score1: number; predicted_score2: number }>(
      "SELECT id, predicted_score1, predicted_score2 FROM predictions WHERE match_id = ?", [m.id]
    );
    if (preds.length) {
      await dbBatch(preds.map((p) => ({
        sql: "UPDATE predictions SET points = ? WHERE id = ?",
        args: [calculatePoints(p.predicted_score1, p.predicted_score2, m.score1, m.score2), p.id],
      })));
    }
  }
}
