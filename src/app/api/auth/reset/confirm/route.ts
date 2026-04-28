import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, pin } = await req.json();

  if (!token || !pin) {
    return NextResponse.json({ error: "Token und PIN erforderlich" }, { status: 400 });
  }

  if (pin.length < 4) {
    return NextResponse.json({ error: "PIN muss mindestens 4 Zeichen haben" }, { status: 400 });
  }

  // Find valid token
  const result = await query(
    "SELECT t.*, u.email FROM pin_reset_tokens t JOIN users u ON t.user_id = u.id WHERE t.token = $1 AND t.used = false AND t.expires_at > NOW()",
    [token]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Ungültiger oder abgelaufener Link" }, { status: 400 });
  }

  const resetToken = result.rows[0];

  // Hash and update PIN
  const hash = await bcrypt.hash(pin, 10);
  await query("UPDATE users SET pin_hash = $1, updated_at = NOW() WHERE id = $2", [hash, resetToken.user_id]);

  // Mark token as used
  await query("UPDATE pin_reset_tokens SET used = true WHERE id = $1", [resetToken.id]);

  return NextResponse.json({ ok: true, email: resetToken.email });
}
