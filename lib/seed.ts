import { getDb } from "./db";
import { FIXTURE_MUNDIAL_2026 } from "./fixture-data";
import { ADMIN_DNIS } from "./types";

function seed() {
  const db = getDb();

  // Insertar admins con nombre placeholder (se actualizará en el primer login)
  const insertAdmin = db.prepare(`
    INSERT OR IGNORE INTO users (dni, name, is_admin) VALUES (?, 'Admin', 1)
  `);
  for (const dni of ADMIN_DNIS) {
    insertAdmin.run(dni);
  }

  // Insertar fixture
  const insertMatch = db.prepare(`
    INSERT OR IGNORE INTO matches
      (external_id, phase, group_name, team1, team2, team1_flag, team2_flag, match_date, venue)
    VALUES
      (@external_id, @phase, @group_name, @team1, @team2, @team1_flag, @team2_flag, @match_date, @venue)
  `);

  const insertMany = db.transaction((matches: typeof FIXTURE_MUNDIAL_2026) => {
    for (const m of matches) {
      insertMatch.run(m);
    }
  });

  insertMany(FIXTURE_MUNDIAL_2026);

  console.log(`✅ Seed completado: ${FIXTURE_MUNDIAL_2026.length} partidos insertados`);
}

seed();
