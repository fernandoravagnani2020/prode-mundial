import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ADMIN_DNIS } from "@/lib/types";
import { FIXTURE_MUNDIAL_2026 } from "@/lib/fixture-data";
import { calculatePoints } from "@/lib/scoring";

// Sincroniza el fixture desde football-data.org si hay API key,
// o recarga el fixture hardcodeado.
export async function POST(req: NextRequest) {
  const { dni } = await req.json();

  if (!(ADMIN_DNIS as readonly string[]).includes(dni)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const apiKey = process.env.FOOTBALL_API_KEY;

  if (apiKey) {
    return syncFromApi(apiKey);
  } else {
    return seedFromLocal();
  }
}

async function syncFromApi(apiKey: string) {
  try {
    const res = await fetch(
      "https://api.football-data.org/v4/competitions/2000/matches",
      { headers: { "X-Auth-Token": apiKey } }
    );

    if (!res.ok) {
      return seedFromLocal();
    }

    const data = await res.json();
    const db = getDb();

    const upsertMatch = db.prepare(`
      INSERT INTO matches (external_id, phase, group_name, team1, team2, team1_flag, team2_flag, match_date, venue, score1, score2, status)
      VALUES (@external_id, @phase, @group_name, @team1, @team2, @team1_flag, @team2_flag, @match_date, @venue, @score1, @score2, @status)
      ON CONFLICT(external_id) DO UPDATE SET
        team1 = excluded.team1, team2 = excluded.team2,
        team1_flag = excluded.team1_flag, team2_flag = excluded.team2_flag,
        match_date = excluded.match_date, venue = excluded.venue,
        score1 = excluded.score1, score2 = excluded.score2,
        status = excluded.status
    `);

    const PHASE_MAP: Record<string, string> = {
      GROUP_STAGE: "group",
      ROUND_OF_32: "r32",
      ROUND_OF_16: "r16",
      QUARTER_FINALS: "qf",
      SEMI_FINALS: "sf",
      FINAL: "f",
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

    let count = 0;
    const sync = db.transaction(() => {
      for (const m of data.matches ?? []) {
        const phase = PHASE_MAP[m.stage] ?? "group";
        const score1 = m.score?.fullTime?.home ?? null;
        const score2 = m.score?.fullTime?.away ?? null;
        const homeCode = m.homeTeam?.tla ?? "";
        const awayCode = m.awayTeam?.tla ?? "";
        upsertMatch.run({
          external_id: String(m.id),
          phase,
          group_name: m.group ? `Grupo ${m.group.replace("GROUP_", "")}` : null,
          team1: m.homeTeam?.name ?? "Por definir",
          team2: m.awayTeam?.name ?? "Por definir",
          team1_flag: FLAG_MAP[homeCode] ?? "🏳️",
          team2_flag: FLAG_MAP[awayCode] ?? "🏳️",
          match_date: m.utcDate ?? new Date().toISOString(),
          venue: m.venue ?? null,
          score1,
          score2,
          status: STATUS_MAP[m.status] ?? "scheduled",
        });
        count++;
      }
    });
    sync();

    // Recalcular puntos de partidos terminados
    recalcularPuntos();

    return NextResponse.json({ success: true, synced: count, source: "api" });
  } catch {
    return seedFromLocal();
  }
}

function seedFromLocal() {
  const db = getDb();

  const upsert = db.prepare(`
    INSERT OR IGNORE INTO matches
      (external_id, phase, group_name, team1, team2, team1_flag, team2_flag, match_date, venue)
    VALUES
      (@external_id, @phase, @group_name, @team1, @team2, @team1_flag, @team2_flag, @match_date, @venue)
  `);

  const insertAll = db.transaction(() => {
    for (const m of FIXTURE_MUNDIAL_2026) {
      upsert.run(m);
    }
  });
  insertAll();

  return NextResponse.json({ success: true, synced: FIXTURE_MUNDIAL_2026.length, source: "local" });
}

function recalcularPuntos() {
  const db = getDb();
  const matches = db.prepare(
    "SELECT id, score1, score2 FROM matches WHERE score1 IS NOT NULL AND score2 IS NOT NULL"
  ).all() as { id: number; score1: number; score2: number }[];

  const preds = db.prepare(
    "SELECT id, predicted_score1, predicted_score2 FROM predictions WHERE match_id = ?"
  );
  const update = db.prepare("UPDATE predictions SET points = ? WHERE id = ?");

  const recalc = db.transaction(() => {
    for (const m of matches) {
      const ps = preds.all(m.id) as { id: number; predicted_score1: number; predicted_score2: number }[];
      for (const p of ps) {
        update.run(calculatePoints(p.predicted_score1, p.predicted_score2, m.score1, m.score2), p.id);
      }
    }
  });
  recalc();
}
