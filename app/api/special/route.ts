import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbRun } from "@/lib/db";
import { SPECIAL_KEYS, isSpecialOpen } from "@/lib/special";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dni = searchParams.get("dni");
  if (!dni) return NextResponse.json({ error: "DNI requerido" }, { status: 400 });

  const row = await dbGet<Record<string, string | null>>(
    "SELECT * FROM special_predictions WHERE user_dni = ?",
    [dni]
  );

  return NextResponse.json({ prediction: row ?? null, open: isSpecialOpen() });
}

export async function POST(req: NextRequest) {
  const { dni, predictions } = await req.json();

  if (!dni) return NextResponse.json({ error: "DNI requerido" }, { status: 400 });
  if (!predictions || typeof predictions !== "object") {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  if (!isSpecialOpen()) {
    return NextResponse.json({ error: "El concurso ya cerró (17 de junio)" }, { status: 400 });
  }

  const user = await dbGet("SELECT dni FROM users WHERE dni = ?", [dni]);
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Sanitize: take only known keys, trim text, cap length
  const values: Record<string, string | null> = {};
  for (const key of SPECIAL_KEYS) {
    const raw = predictions[key];
    values[key] = typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 80) : null;
  }

  await dbRun(
    `INSERT INTO special_predictions
       (user_dni, champion, runner_up, third, fourth, best_player, best_goalkeeper, young_star, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_dni) DO UPDATE SET
       champion = excluded.champion,
       runner_up = excluded.runner_up,
       third = excluded.third,
       fourth = excluded.fourth,
       best_player = excluded.best_player,
       best_goalkeeper = excluded.best_goalkeeper,
       young_star = excluded.young_star,
       updated_at = datetime('now')`,
    [
      dni,
      values.champion,
      values.runner_up,
      values.third,
      values.fourth,
      values.best_player,
      values.best_goalkeeper,
      values.young_star,
    ]
  );

  return NextResponse.json({ success: true });
}
