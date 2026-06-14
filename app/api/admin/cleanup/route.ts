import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun, dbGet } from "@/lib/db";
import { ADMIN_DNIS } from "@/lib/types";

// Un partido es "real" (de la API) si su external_id es puramente numérico.
// Los partidos huérfanos del fixture local tienen ids con letras: group-A-1, r32-1, sf-1, final...
const isApiMatch = (externalId: string | null) => !!externalId && /^\d+$/.test(externalId);

interface MatchRow {
  id: number;
  external_id: string | null;
  team1: string;
  team2: string;
  phase: string;
  match_date: string;
}

async function analizar() {
  const matches = await dbAll<MatchRow>("SELECT id, external_id, team1, team2, phase, match_date FROM matches");
  const apiMatches = matches.filter((m) => isApiMatch(m.external_id));
  const orphanMatches = matches.filter((m) => !isApiMatch(m.external_id));

  // Contar pronósticos por partido huérfano
  const orphanDetail = [];
  let orphanPredTotal = 0;
  for (const m of orphanMatches) {
    const row = await dbGet<{ c: number }>(
      "SELECT COUNT(*) as c FROM predictions WHERE match_id = ?",
      [m.id]
    );
    const predCount = row?.c ?? 0;
    orphanPredTotal += predCount;
    orphanDetail.push({
      id: m.id,
      external_id: m.external_id,
      teams: `${m.team1} vs ${m.team2}`,
      phase: m.phase,
      predictions: predCount,
    });
  }

  return {
    total: matches.length,
    apiCount: apiMatches.length,
    orphanCount: orphanMatches.length,
    orphanPredTotal,
    orphanDetail,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dni = searchParams.get("dni");
  if (!dni || !(ADMIN_DNIS as readonly string[]).includes(dni)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return NextResponse.json(await analizar());
}

export async function POST(req: NextRequest) {
  const { dni } = await req.json();
  if (!dni || !(ADMIN_DNIS as readonly string[]).includes(dni)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // 1) BACKUP de seguridad — copia completa de las tres tablas con sufijo de fecha
  const ts = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14); // YYYYMMDDHHMMSS
  const suffix = `bk_${ts}`;
  await dbRun(`CREATE TABLE IF NOT EXISTS users_${suffix} AS SELECT * FROM users`);
  await dbRun(`CREATE TABLE IF NOT EXISTS predictions_${suffix} AS SELECT * FROM predictions`);
  await dbRun(`CREATE TABLE IF NOT EXISTS matches_${suffix} AS SELECT * FROM matches`);

  // 2) Analizar el estado actual
  const report = await analizar();

  // 3) Borrar SOLO los partidos huérfanos que no tengan ningún pronóstico
  const safeToDelete = report.orphanDetail.filter((m) => m.predictions === 0);
  const keptWithPredictions = report.orphanDetail.filter((m) => m.predictions > 0);

  for (const m of safeToDelete) {
    await dbRun("DELETE FROM matches WHERE id = ?", [m.id]);
  }

  return NextResponse.json({
    success: true,
    backup: suffix,
    deleted: safeToDelete.length,
    keptWithPredictions: keptWithPredictions.length,
    keptDetail: keptWithPredictions,
    apiMatches: report.apiCount,
  });
}
