import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// Redirect to Todoist OAuth
export async function GET() {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const clientId = process.env.TODOIST_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Todoist nicht konfiguriert" }, { status: 500 });

  const state = Buffer.from(JSON.stringify({ userId: user.userId })).toString("base64");
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/todoist/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "data:read_write",
    state,
    redirect_uri: redirectUri,
  });

  return NextResponse.redirect(`https://todoist.com/oauth/authorize?${params}`);
}
