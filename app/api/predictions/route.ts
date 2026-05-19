import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calculatePoints } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  const { dni, match_id, predicted_score1, predicted_score2 } = await req.json();

  if (!dni || match_id == null || predicted_score1 == null || predicted_score2 == null) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  if (predicted_score1 < 0 || predicted_score2 < 0 || predicted_score1 > 30 || predicted_score2 > 30) {
    return NextResponse.json({ error: "Marcador inválido" }, { status: 400 });
  }

  const db = getDb();

  const user = db.prepare("SELECT dni FROM users WHERE dni = ?").get(dni);
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(match_id) as
    | { id: number; match_date: string; status: string; score1: number | null; score2: number | null } | undefined;
  if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  // Timezone Argentina: UTC-3 (no DST)
  const nowUTC = Date.now();
  const matchDateMs = new Date(match.match_date).getTime();
  const cutoffMs = matchDateMs - 10 * 60 * 1000; // 10 minutos antes

  if (match.status === "finished") {
    return NextResponse.json({ error: "El partido ya terminó, no se puede modificar el pronóstico" }, { status: 400 });
  }
  if (nowUTC >= cutoffMs) {
    const minutesLeft = Math.ceil((cutoffMs - nowUTC) / 60000);
    const msg = nowUTC >= matchDateMs
      ? "El partido ya comenzó"
      : `El pronóstico cierra 10 minutos antes del partido`;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Calcular puntos si el partido ya tiene resultado
  let points: number | null = null;
  if (match.score1 != null && match.score2 != null) {
    points = calculatePoints(predicted_score1, predicted_score2, match.score1, match.score2);
  }

  db.prepare(`
    INSERT INTO predictions (user_dni, match_id, predicted_score1, predicted_score2, points, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_dni, match_id) DO UPDATE SET
      predicted_score1 = excluded.predicted_score1,
      predicted_score2 = excluded.predicted_score2,
      points = excluded.points,
      updated_at = datetime('now')
  `).run(dni, match_id, predicted_score1, predicted_score2, points);

  return NextResponse.json({ success: true, points });
}
