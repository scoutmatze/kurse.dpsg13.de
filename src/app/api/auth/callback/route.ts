import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createToken, setAuthCookie } from "@/lib/auth";

function getBase(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "kurse.dpsgonline.de";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return proto + "://" + host;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", getBase(req)));
  }

  const clientId = process.env.AZURE_AD_CLIENT_ID!;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET!;
  const tenantId = process.env.AZURE_AD_TENANT_ID!;
  const redirectUri = (process.env.NEXTAUTH_URL || "https://kurse.dpsgonline.de") + "/api/auth/callback";

  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: "openid profile email User.Read",
        }),
      }
    );

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL("/login?error=token_failed", getBase(req)));
    }

    const tokenData = await tokenRes.json();

    const graphRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!graphRes.ok) {
      return NextResponse.redirect(new URL("/login?error=graph_failed", getBase(req)));
    }

    const profile = await graphRes.json();
    const email = (profile.mail || profile.userPrincipalName || "").toLowerCase();
    const name = profile.displayName || email;
    const oid = profile.id;

    let userResult = await query("SELECT * FROM users WHERE email = $1", [email]);

    if (userResult.rows.length === 0) {
      userResult = await query(
        "INSERT INTO users (email, name, azure_oid, role) VALUES ($1, $2, $3, 'user') RETURNING *",
        [email, name, oid]
      );
    } else {
      await query(
        "UPDATE users SET azure_oid = $1, name = $2, updated_at = NOW() WHERE email = $3",
        [oid, name, email]
      );
    }

    const user = userResult.rows[0];
    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name || email,
      role: user.role,
    });

    await setAuthCookie(token);
    return NextResponse.redirect(new URL("/dashboard", getBase(req)));
  } catch (err) {
    console.error("Azure AD callback error:", err);
    return NextResponse.redirect(new URL("/login?error=unknown", getBase(req)));
  }
}
