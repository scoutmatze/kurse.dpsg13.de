import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?error=todoist_no_code", req.url));
  }

  try {
    const { userId } = JSON.parse(Buffer.from(state, "base64").toString());

    // Exchange code for token
    const tokenRes = await fetch("https://todoist.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.TODOIST_CLIENT_ID,
        client_secret: process.env.TODOIST_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/dashboard?error=todoist_token", req.url));
    }

    const { access_token } = await tokenRes.json();

    // Store token for user
    await query(
      "UPDATE users SET todoist_token = $1, todoist_connected_at = NOW() WHERE id = $2",
      [access_token, userId]
    );

    return NextResponse.redirect(new URL("/dashboard?todoist=connected", req.url));
  } catch (err) {
    console.error("Todoist callback error:", err);
    return NextResponse.redirect(new URL("/dashboard?error=todoist_failed", req.url));
  }
}
