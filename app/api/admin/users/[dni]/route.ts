import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ADMIN_DNIS } from "@/lib/types";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ dni: string }> }
) {
  const { dni: targetDni } = await params;
  const { searchParams } = new URL(req.url);
  const adminDni = searchParams.get("admin_dni");

  if (!adminDni || !(ADMIN_DNIS as readonly string[]).includes(adminDni)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if ((ADMIN_DNIS as readonly string[]).includes(targetDni)) {
    return NextResponse.json({ error: "No se puede eliminar un admin" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("DELETE FROM predictions WHERE user_dni = ?").run(targetDni);
  db.prepare("DELETE FROM users WHERE dni = ?").run(targetDni);

  return NextResponse.json({ success: true });
}
