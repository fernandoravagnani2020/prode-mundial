import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbAll, dbRun, dbBatch } from "@/lib/db";
import { ADMIN_DNIS } from "@/lib/types";
import { calculatePoints } from "@/lib/scoring";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { dni, score1, score2, team1, team2, team1_flag, team2_flag, match_date, venue, status, winner_team } = await req.json();

  if (!(ADMIN_DNIS as readonly string[]).includes(dni)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const matchId = parseInt(id);
  const match = await dbGet("SELECT id FROM matches WHERE id = ?", [matchId]);
  if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  const advancer: string | null =
    winner_team === "team1" || winner_team === "team2" ? winner_team : null;

  await dbRun(`
    UPDATE matches SET
      score1 = COALESCE(?, score1),
      score2 = COALESCE(?, score2),
      team1 = COALESCE(?, team1),
      team2 = COALESCE(?, team2),
      team1_flag = COALESCE(?, team1_flag),
      team2_flag = COALESCE(?, team2_flag),
      match_date = COALESCE(?, match_date),
      venue = COALESCE(?, venue),
      status = COALESCE(?, status),
      winner_team = COALESCE(?, winner_team)
    WHERE id = ?
  `, [
    score1 ?? null, score2 ?? null,
    team1 ?? null, team2 ?? null,
    team1_flag ?? null, team2_flag ?? null,
    match_date ?? null, venue ?? null,
    status ?? null,
    advancer,
    matchId,
  ]);

  if (score1 != null && score2 != null) {
    const m = await dbGet<{ winner_team: string | null }>("SELECT winner_team FROM matches WHERE id = ?", [matchId]);
    const predictions = await dbAll<{ id: number; predicted_score1: number; predicted_score2: number; predicted_advancer: string | null }>(
      "SELECT id, predicted_score1, predicted_score2, predicted_advancer FROM predictions WHERE match_id = ?", [matchId]
    );
    if (predictions.length) {
      await dbBatch(predictions.map((p) => ({
        sql: "UPDATE predictions SET points = ? WHERE id = ?",
        args: [
          calculatePoints(p.predicted_score1, p.predicted_score2, score1, score2, {
            predictedAdvancer: p.predicted_advancer,
            actualAdvancer: m?.winner_team ?? null,
          }),
          p.id,
        ],
      })));
    }
  }

  return NextResponse.json({ success: true });
}
