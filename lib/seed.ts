import { dbRun, dbBatch } from "./db";
import { FIXTURE_MUNDIAL_2026 } from "./fixture-data";
import { ADMIN_DNIS } from "./types";

async function seed() {
  for (const dni of ADMIN_DNIS) {
    await dbRun("INSERT OR IGNORE INTO users (dni, name, is_admin) VALUES (?, 'Admin', 1)", [dni]);
  }

  await dbBatch(FIXTURE_MUNDIAL_2026.map((m) => ({
    sql: `INSERT OR IGNORE INTO matches
            (external_id, phase, group_name, team1, team2, team1_flag, team2_flag, match_date, venue)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [m.external_id, m.phase, m.group_name, m.team1, m.team2, m.team1_flag, m.team2_flag, m.match_date, m.venue ?? null],
  })));

  console.log(`✅ Seed completado: ${FIXTURE_MUNDIAL_2026.length} partidos insertados`);
}

seed().catch(console.error);
