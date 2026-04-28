import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendEmail, anmeldebestaetigungHtml } from "@/lib/email";
import crypto from "crypto";

// GET kurs info (public, minimal)
export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const { kursId } = await params;

  const kurs = await query(
    `SELECT id, name, beschreibung, start_datum, end_datum, ort, max_teilnehmende, status
     FROM kurse WHERE id = $1`,
    [kursId]
  );

  if (kurs.rows.length === 0) {
    return NextResponse.json({ error: "Kurs nicht gefunden" }, { status: 404 });
  }

  const k = kurs.rows[0];
  if (k.status !== "ausgeschrieben" && k.status !== "laufend") {
    return NextResponse.json({ error: "Anmeldung nicht möglich", status: k.status }, { status: 403 });
  }

  const count = await query("SELECT COUNT(*) FROM anmeldungen WHERE kurs_id = $1 AND status != \'storniert\'", [kursId]);
  const tnCount = Number(count.rows[0].count);

  return NextResponse.json({
    ...k,
    tn_count: tnCount,
    plaetze_frei: k.max_teilnehmende ? k.max_teilnehmende - tnCount : null,
    ist_voll: k.max_teilnehmende ? tnCount >= k.max_teilnehmende : false,
  });
}

// POST new anmeldung (public, no auth)
export async function POST(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const { kursId } = await params;
  const body = await req.json();

  // Validate
  if (!body.vorname || !body.nachname || !body.email || !body.agb_akzeptiert || !body.datenschutz_akzeptiert) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }

  // Check kurs
  const kurs = await query("SELECT id, name, status, max_teilnehmende, start_datum, end_datum, ort FROM kurse WHERE id = $1", [kursId]);
  if (kurs.rows.length === 0) return NextResponse.json({ error: "Kurs nicht gefunden" }, { status: 404 });
  const k = kurs.rows[0];
  if (k.status !== "ausgeschrieben" && k.status !== "laufend") {
    return NextResponse.json({ error: "Anmeldung nicht möglich" }, { status: 403 });
  }

  // Check capacity
  const count = await query("SELECT COUNT(*) FROM anmeldungen WHERE kurs_id = $1 AND status != \'storniert\'", [kursId]);
  const tnCount = Number(count.rows[0].count);
  const status = k.max_teilnehmende && tnCount >= k.max_teilnehmende ? "warteliste" : "eingegangen";

  // Check duplicate
  const existing = await query(
    "SELECT id FROM anmeldungen WHERE kurs_id = $1 AND email = $2 AND status != \'storniert\'",
    [kursId, body.email.toLowerCase()]
  );
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "Du bist bereits angemeldet" }, { status: 409 });
  }

  // Insert
  const result = await query(
    `INSERT INTO anmeldungen (kurs_id, vorname, nachname, email, telefon, geburtsdatum,
     stamm, bezirk, dioezese, strasse, plz, ort, ernaehrung, allergien, unvertraeglichkeiten,
     efz_vorhanden, efz_datum, agb_akzeptiert, datenschutz_akzeptiert, foto_erlaubnis, anmerkungen, bundesland, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$23)
     RETURNING id, status`,
    [kursId, body.vorname, body.nachname, body.email.toLowerCase(), body.telefon,
     body.geburtsdatum || null, body.stamm, body.bezirk, body.dioezese,
     body.strasse, body.plz, body.ort_adresse, body.ernaehrung || "normal",
     body.allergien, body.unvertraeglichkeiten, body.efz_vorhanden || false,
     body.efz_datum || null, body.agb_akzeptiert, body.datenschutz_akzeptiert,
     body.foto_erlaubnis || false, body.anmerkungen, body.bundesland || null, status]
  );

  const anmeldungId = result.rows[0].id;

  // Generate TN-Portal token
  const tnToken = crypto.randomBytes(32).toString("hex");
  await query(
    "INSERT INTO tn_tokens (anmeldung_id, token) VALUES ($1, $2)",
    [anmeldungId, tnToken]
  );

  // Send confirmation email
  const datumStr = k.start_datum && k.end_datum
    ? `${new Date(k.start_datum).toLocaleDateString("de-DE")} – ${new Date(k.end_datum).toLocaleDateString("de-DE")}`
    : "Datum folgt";

  const portalUrl = `${process.env.NEXTAUTH_URL}/teilnehmer/${tnToken}`;
  const htmlBody = anmeldebestaetigungHtml(body.vorname, k.name, k.ort || "Ort folgt", datumStr)
    .replace("</body>", `<p style="font-size:13px;margin-top:16px;">Dein persönliches Kursportal: <a href="${portalUrl}" style="color:#003056;">${portalUrl}</a></p></body>`);

  // Fire and forget — don't block registration on email
  sendEmail(body.email.toLowerCase(), `Anmeldebestätigung: ${k.name}`, htmlBody).catch(console.error);

  return NextResponse.json({
    id: anmeldungId,
    status: result.rows[0].status,
    warteliste: status === "warteliste",
    portal_token: tnToken,
  }, { status: 201 });
}
