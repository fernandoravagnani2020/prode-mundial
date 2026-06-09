import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbRun } from "@/lib/db";
import { calculatePoints } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  const { dni, match_id, predicted_score1, predicted_score2, predicted_advancer } = await req.json();

  if (!dni || match_id == null || predicted_score1 == null || predicted_score2 == null) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  if (predicted_score1 < 0 || predicted_score2 < 0 || predicted_score1 > 30 || predicted_score2 > 30) {
    return NextResponse.json({ error: "Marcador inválido" }, { status: 400 });
  }
  const advancer: string | null =
    predicted_advancer === "team1" || predicted_advancer === "team2" ? predicted_advancer : null;

  const user = await dbGet("SELECT dni FROM users WHERE dni = ?", [dni]);
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const match = await dbGet<{ id: number; match_date: string; status: string; score1: number | null; score2: number | null; winner_team: string | null }>(
    "SELECT * FROM matches WHERE id = ?", [match_id]
  );
  if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  const nowUTC = Date.now();
  const matchDateMs = new Date(match.match_date).getTime();
  const cutoffMs = matchDateMs - 10 * 60 * 1000;

  if (match.status === "finished") {
    return NextResponse.json({ error: "El partido ya terminó, no se puede modificar el pronóstico" }, { status: 400 });
  }
  if (nowUTC >= cutoffMs) {
    const msg = nowUTC >= matchDateMs
      ? "El partido ya comenzó"
      : "El pronóstico cierra 10 minutos antes del partido";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let points: number | null = null;
  if (match.score1 != null && match.score2 != null) {
    points = calculatePoints(predicted_score1, predicted_score2, match.score1, match.score2, {
      predictedAdvancer: advancer,
      actualAdvancer: match.winner_team,
    });
  }

  await dbRun(`
    INSERT INTO predictions (user_dni, match_id, predicted_score1, predicted_score2, predicted_advancer, points, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_dni, match_id) DO UPDATE SET
      predicted_score1 = excluded.predicted_score1,
      predicted_score2 = excluded.predicted_score2,
      predicted_advancer = excluded.predicted_advancer,
      points = excluded.points,
      updated_at = datetime('now')
  `, [dni, match_id, predicted_score1, predicted_score2, advancer, points]);

  return NextResponse.json({ success: true, points });
}
