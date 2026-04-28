import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

// POST: Request PIN reset (public)
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "E-Mail erforderlich" }, { status: 400 });

  const user = await query("SELECT id, name, email FROM users WHERE email = $1", [email.toLowerCase()]);
  
  // Always return success (don't reveal if email exists)
  if (user.rows.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const u = user.rows[0];
  const token = crypto.randomBytes(32).toString("hex");

  // Invalidate old tokens
  await query("UPDATE pin_reset_tokens SET used = true WHERE user_id = $1 AND used = false", [u.id]);

  // Create new token
  await query(
    "INSERT INTO pin_reset_tokens (user_id, token) VALUES ($1, $2)",
    [u.id, token]
  );

  // Send email
  const resetUrl = `${process.env.NEXTAUTH_URL}/pin-reset?token=${token}`;
  const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"></head>
<body style="font-family: 'PT Sans Narrow', Arial, sans-serif; color: #1a1815; margin: 0; padding: 0; background: #faf9f6;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
    <div style="background: #003056; padding: 20px 24px; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; font-size: 20px; margin: 0;">PIN zurücksetzen</h1>
    </div>
    <div style="height: 3px; background: #8b0a1e;"></div>
    <div style="background: white; padding: 24px; border: 1px solid #d4d0c8; border-top: none; border-radius: 0 0 12px 12px;">
      <p>Hallo ${u.name || ""},</p>
      <p>du hast eine PIN-Zurücksetzung für das DPSG Kursmanagement angefordert.</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="background: #003056; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Neue PIN setzen</a>
      </p>
      <p style="font-size: 13px; color: #5c5850;">Dieser Link ist 1 Stunde gültig. Falls du keine Zurücksetzung angefordert hast, ignoriere diese E-Mail.</p>
      <p style="margin-top: 24px;">Gut Pfad!</p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail(email.toLowerCase(), "PIN zurücksetzen — DPSG Kursmanagement", html);

  return NextResponse.json({ ok: true });
}
