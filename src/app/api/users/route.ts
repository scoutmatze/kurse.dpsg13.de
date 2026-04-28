import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

async function isAdmin(userId: number) {
  const r = await query("SELECT role FROM users WHERE id=$1", [userId]);
  return r.rows[0]?.role === "admin" || r.rows[0]?.role === "tenant_admin";
}

export async function GET() {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!(await isAdmin(user.userId))) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

  const result = await query("SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC");
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!(await isAdmin(user.userId))) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

  const { email, name, pin, role } = await req.json();
  if (!email || !pin) return NextResponse.json({ error: "E-Mail und PIN erforderlich" }, { status: 400 });

  const hash = await bcrypt.hash(pin, 10);
  const result = await query(
    "INSERT INTO users (email, name, pin_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, email, name, role",
    [email.toLowerCase(), name || email, hash, role || "user"]
  );
  return NextResponse.json(result.rows[0], { status: 201 });
}


export async function PUT(req: NextRequest) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!(await isAdmin(user.userId))) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  const { user_id, pin } = await req.json();
  const hash = await bcrypt.hash(pin, 10);
  await query("UPDATE users SET pin_hash = $1, updated_at = NOW() WHERE id = $2", [hash, user_id]);
  return NextResponse.json({ ok: true });
}
