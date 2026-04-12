import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const result = await query(
    "SELECT todoist_token IS NOT NULL as connected, todoist_connected_at FROM users WHERE id = $1",
    [user.userId]
  );

  return NextResponse.json({
    connected: result.rows[0]?.connected || false,
    connected_at: result.rows[0]?.todoist_connected_at,
  });
}

// Disconnect
export async function DELETE() {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  await query(
    "UPDATE users SET todoist_token = NULL, todoist_connected_at = NULL WHERE id = $1",
    [user.userId]
  );

  return NextResponse.json({ ok: true });
}
