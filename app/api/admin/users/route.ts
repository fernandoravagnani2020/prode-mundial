import { NextRequest, NextResponse } from "next/server";
import { dbAll } from "@/lib/db";
import { ADMIN_DNIS } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dni = searchParams.get("dni");

  if (!dni || !(ADMIN_DNIS as readonly string[]).includes(dni)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const users = await dbAll(`
    SELECT u.dni, u.name, u.is_admin, u.created_at,
           COUNT(p.id) as total_predictions
    FROM users u
    LEFT JOIN predictions p ON u.dni = p.user_dni
    GROUP BY u.dni
    ORDER BY u.created_at DESC
  `);

  return NextResponse.json({ users });
}
