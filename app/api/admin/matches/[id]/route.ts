import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ADMIN_DNIS } from "@/lib/types";
import { calculatePoints } from "@/lib/scoring";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { dni, score1, score2, team1, team2, team1_flag, team2_flag, match_date, venue, status } = await req.json();

  if (!(ADMIN_DNIS as readonly string[]).includes(dni)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const db = getDb();
  const matchId = parseInt(id);

  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId) as
    | { id: number } | undefined;
  if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  // Actualizar datos del partido
  db.prepare(`
    UPDATE matches SET
      score1 = COALESCE(?, score1),
      score2 = COALESCE(?, score2),
      team1 = COALESCE(?, team1),
      team2 = COALESCE(?, team2),
      team1_flag = COALESCE(?, team1_flag),
      team2_flag = COALESCE(?, team2_flag),
      match_date = COALESCE(?, match_date),
      venue = COALESCE(?, venue),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(
    score1 ?? null, score2 ?? null,
    team1 ?? null, team2 ?? null,
    team1_flag ?? null, team2_flag ?? null,
    match_date ?? null, venue ?? null,
    status ?? null,
    matchId
  );

  // Si hay resultado, recalcular puntos de todas las predicciones de este partido
  if (score1 != null && score2 != null) {
    const predictions = db.prepare(
      "SELECT id, user_dni, predicted_score1, predicted_score2 FROM predictions WHERE match_id = ?"
    ).all(matchId) as { id: number; user_dni: string; predicted_score1: number; predicted_score2: number }[];

    const updatePoints = db.prepare(
      "UPDATE predictions SET points = ? WHERE id = ?"
    );

    const updateAll = db.transaction(() => {
      for (const p of predictions) {
        const pts = calculatePoints(p.predicted_score1, p.predicted_score2, score1, score2);
        updatePoints.run(pts, p.id);
      }
    });
    updateAll();
  }

  return NextResponse.json({ success: true });
}
