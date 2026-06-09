import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbRun } from "@/lib/db";
import { ADMIN_DNIS } from "@/lib/types";
import { hashPassword, verifyPassword } from "@/lib/hash";

const ADMIN_DEFAULT_PASSWORD = "Bertola1980";

type UserRow = { dni: string; name: string; is_admin: number; password_hash: string | null };

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { dni, name, password } = body as { dni?: string; name?: string; password?: string };

  // Validate DNI
  if (!dni || typeof dni !== "string" || !/^\d{7,8}$/.test(dni.trim())) {
    return NextResponse.json({ error: "DNI inválido" }, { status: 400 });
  }
  const trimmedDni = dni.trim();
  const isAdmin = (ADMIN_DNIS as readonly string[]).includes(trimmedDni);

  // ── STEP 1: only DNI provided → check existence ───────────────────────────
  if (!password && !name) {
    const user = await dbGet<UserRow>("SELECT * FROM users WHERE dni = ?", [trimmedDni]);

    if (!user) {
      return NextResponse.json({ status: "new" });
    }

    // Existing admin with no password → auto-set default
    if (isAdmin && !user.password_hash) {
      await dbRun("UPDATE users SET password_hash = ?, is_admin = 1 WHERE dni = ?", [
        hashPassword(ADMIN_DEFAULT_PASSWORD),
        trimmedDni,
      ]);
    }

    // Existing non-admin with no password → first login, must set password
    if (!user.password_hash && !isAdmin) {
      return NextResponse.json({ status: "first_login", name: user.name });
    }

    return NextResponse.json({ status: "existing" });
  }

  // ── STEP 2a: DNI + password → log in or set first password ──────────────
  if (password && !name) {
    if (password.length < 4) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 4 caracteres" }, { status: 400 });
    }

    const user = await dbGet<UserRow>("SELECT * FROM users WHERE dni = ?", [trimmedDni]);
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // First-time login: user exists but has no password yet → set it now
    if (!user.password_hash) {
      await dbRun("UPDATE users SET password_hash = ?, is_admin = ? WHERE dni = ?", [
        hashPassword(password),
        isAdmin ? 1 : user.is_admin,
        trimmedDni,
      ]);
      return NextResponse.json({ dni: user.dni, name: user.name, isAdmin: isAdmin || user.is_admin === 1 });
    }

    // Normal login: verify password
    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    // Ensure admin flag is updated
    if (isAdmin && !user.is_admin) {
      await dbRun("UPDATE users SET is_admin = 1 WHERE dni = ?", [trimmedDni]);
    }

    return NextResponse.json({
      dni: user.dni,
      name: user.name,
      isAdmin: isAdmin || user.is_admin === 1,
    });
  }

  // ── STEP 2b: DNI + name + password → register new user ───────────────────
  if (password && name) {
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 4 caracteres" }, { status: 400 });
    }

    // Check if user already exists (edge case: race condition)
    const existing = await dbGet<UserRow>("SELECT dni FROM users WHERE dni = ?", [trimmedDni]);
    if (existing) {
      return NextResponse.json({ error: "El DNI ya está registrado" }, { status: 409 });
    }

    const hash = hashPassword(password);
    await dbRun(
      "INSERT INTO users (dni, name, is_admin, password_hash) VALUES (?, ?, ?, ?)",
      [trimmedDni, name.trim(), isAdmin ? 1 : 0, hash]
    );

    return NextResponse.json({ dni: trimmedDni, name: name.trim(), isAdmin: isAdmin });
  }

  // ── STEP 2c: first_login — existing user setting password for first time ──
  // body: { dni, password } but user has no hash → handled in 2a path above
  // (no name needed since it's already in DB)

  return NextResponse.json({ error: "Datos insuficientes" }, { status: 400 });
}
