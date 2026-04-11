import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createToken, setAuthCookie, clearAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, pin } = await req.json();
  if (!email || !pin) {
    return NextResponse.json({ error: "E-Mail und PIN erforderlich" }, { status: 400 });
  }

  const result = await query("SELECT id, email, name, role, pin_hash FROM users WHERE email = $1", [email.toLowerCase()]);
  const user = result.rows[0];
  if (!user || !user.pin_hash) {
    return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });
  }

  const valid = await bcrypt.compare(pin, user.pin_hash);
  if (!valid) {
    return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });
  }

  const token = await createToken({
    userId: user.id, email: user.email,
    name: user.name || user.email, role: user.role,
  });
  await setAuthCookie(token);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

export async function DELETE() {
  await clearAuthCookie();
  return NextResponse.json({ ok: true });
}
