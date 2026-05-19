import { NextRequest, NextResponse } from "next/server";
import { dbAll } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phase = searchParams.get("phase");
  const dni = searchParams.get("dni");

  let matchesQuery = "SELECT * FROM matches";
  const params: string[] = [];
  if (phase) {
    matchesQuery += " WHERE phase = ?";
    params.push(phase);
  }
  matchesQuery += " ORDER BY match_date ASC";

  const matches = await dbAll(matchesQuery, params);

  let predictions: Record<number, { predicted_score1: number; predicted_score2: number; points: number | null }> = {};
  if (dni) {
    const preds = await dbAll<{ match_id: number; predicted_score1: number; predicted_score2: number; points: number | null }>(
      "SELECT match_id, predicted_score1, predicted_score2, points FROM predictions WHERE user_dni = ?", [dni]
    );
    for (const p of preds) {
      predictions[p.match_id] = {
        predicted_score1: p.predicted_score1,
        predicted_score2: p.predicted_score2,
        points: p.points,
      };
    }
  }

  return NextResponse.json({ matches, predictions });
}
