import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const redirectUri = process.env.NEXTAUTH_URL
    ? process.env.NEXTAUTH_URL + "/api/auth/callback"
    : "https://kurse.dpsgonline.de/api/auth/callback";

  if (!clientId || !tenantId) {
    return NextResponse.json({ error: "Azure AD nicht konfiguriert" }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "openid profile email User.Read",
    response_mode: "query",
  });

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;
  return NextResponse.redirect(authUrl);
}
