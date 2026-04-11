// E-Mail-Versand via Microsoft Graph API (Client Credentials)

const GRAPH_TOKEN_URL = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;
const GRAPH_API = "https://graph.microsoft.com/v1.0";
const SENDER = process.env.EMAIL_SENDER || "kurse@dpsg1300.de";

async function getGraphToken(): Promise<string> {
  const res = await fetch(GRAPH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) throw new Error("Graph token request failed");
  const data = await res.json();
  return data.access_token;
}

export async function sendEmail(to: string, subject: string, htmlBody: string) {
  try {
    const token = await getGraphToken();

    const res = await fetch(`${GRAPH_API}/users/${SENDER}/sendMail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: htmlBody },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Graph sendMail error:", err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email error:", err);
    return false;
  }
}

export function anmeldebestaetigungHtml(vorname: string, kursName: string, kursOrt: string, kursDatum: string) {
  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"></head>
<body style="font-family: 'PT Sans Narrow', Arial, sans-serif; color: #1a1815; margin: 0; padding: 0; background: #faf9f6;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
    <div style="background: #003056; padding: 20px 24px; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; font-size: 20px; margin: 0;">Anmeldebestätigung</h1>
    </div>
    <div style="height: 3px; background: #8b0a1e;"></div>
    <div style="background: white; padding: 24px; border: 1px solid #d4d0c8; border-top: none; border-radius: 0 0 12px 12px;">
      <p>Hallo ${vorname},</p>
      <p>deine Anmeldung für <strong>${kursName}</strong> ist bei uns eingegangen!</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #5c5850; font-size: 13px;">Kurs</td><td style="padding: 8px 0; font-weight: bold;">${kursName}</td></tr>
        <tr><td style="padding: 8px 0; color: #5c5850; font-size: 13px;">Ort</td><td style="padding: 8px 0;">${kursOrt}</td></tr>
        <tr><td style="padding: 8px 0; color: #5c5850; font-size: 13px;">Zeitraum</td><td style="padding: 8px 0;">${kursDatum}</td></tr>
      </table>
      <p style="font-size: 13px; color: #5c5850;">Wir melden uns mit weiteren Informationen bei dir. Bei Fragen wende dich an die Kursleitung.</p>
      <p style="margin-top: 24px;">Gut Pfad!</p>
      <p style="font-size: 12px; color: #9e9a92; margin-top: 16px;">Deutsche Pfadfinder*innenschaft Sankt Georg</p>
    </div>
  </div>
</body>
</html>`;
}
