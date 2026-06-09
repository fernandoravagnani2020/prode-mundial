import { NextRequest, NextResponse } from "next/server";
import { dbRun, dbBatch } from "@/lib/db";
import { ADMIN_DNIS } from "@/lib/types";

// Resetea la contraseña de un usuario (la deja vacía) para que pueda
// elegir una nueva en su próximo ingreso. No borra sus pronósticos.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ dni: string }> }
) {
  const { dni: targetDni } = await params;
  const { admin_dni } = await req.json();

  if (!admin_dni || !(ADMIN_DNIS as readonly string[]).includes(admin_dni)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await dbRun("UPDATE users SET password_hash = NULL WHERE dni = ?", [targetDni]);
  return NextResponse.json({ success: true });
}

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

  await dbBatch([
    { sql: "DELETE FROM predictions WHERE user_dni = ?", args: [targetDni] },
    { sql: "DELETE FROM users WHERE dni = ?", args: [targetDni] },
  ]);

  return NextResponse.json({ success: true });
}
