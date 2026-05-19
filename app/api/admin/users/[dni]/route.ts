import { NextRequest, NextResponse } from "next/server";
import { dbRun, dbBatch } from "@/lib/db";
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

  await dbBatch([
    { sql: "DELETE FROM predictions WHERE user_dni = ?", args: [targetDni] },
    { sql: "DELETE FROM users WHERE dni = ?", args: [targetDni] },
  ]);

  return NextResponse.json({ success: true });
}
