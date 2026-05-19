import { NextResponse } from "next/server";
import { dbAll } from "@/lib/db";

export async function GET() {
  const rows = await dbAll<{
    dni: string; name: string; points: number;
    exact: number; partial: number; wrong: number; total_predictions: number;
  }>(`
    SELECT
      u.dni, u.name,
      COALESCE(SUM(p.points), 0) AS points,
      COUNT(CASE WHEN p.points = 3 THEN 1 END) AS exact,
      COUNT(CASE WHEN p.points = 1 THEN 1 END) AS partial,
      COUNT(CASE WHEN p.points = 0 AND p.id IS NOT NULL THEN 1 END) AS wrong,
      COUNT(p.id) AS total_predictions
    FROM users u
    LEFT JOIN predictions p ON u.dni = p.user_dni
    GROUP BY u.dni
    ORDER BY points DESC, exact DESC, partial DESC, u.name ASC
  `);

  const leaderboard = rows.map((row, index) => ({ rank: index + 1, ...row }));
  return NextResponse.json({ leaderboard });
}
