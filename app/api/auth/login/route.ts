import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ADMIN_DNIS } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { dni, name } = await req.json();

  if (!dni || typeof dni !== "string" || !/^\d{7,8}$/.test(dni.trim())) {
    return NextResponse.json({ error: "DNI inválido" }, { status: 400 });
  }

  const db = getDb();
  const trimmedDni = dni.trim();
  const isAdmin = (ADMIN_DNIS as readonly string[]).includes(trimmedDni) ? 1 : 0;

  let user = db.prepare("SELECT * FROM users WHERE dni = ?").get(trimmedDni) as
    | { dni: string; name: string; is_admin: number } | undefined;

  if (!user) {
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ needsName: true }, { status: 200 });
    }
    db.prepare(
      "INSERT INTO users (dni, name, is_admin) VALUES (?, ?, ?)"
    ).run(trimmedDni, name.trim(), isAdmin);
    user = { dni: trimmedDni, name: name.trim(), is_admin: isAdmin };
  } else if (isAdmin && !user.is_admin) {
    // Actualizar admin si fue creado sin ese flag
    db.prepare("UPDATE users SET is_admin = 1 WHERE dni = ?").run(trimmedDni);
    user = { ...user, is_admin: 1 };
  }

  return NextResponse.json({
    dni: user.dni,
    name: user.name,
    isAdmin: user.is_admin === 1,
  });
}
