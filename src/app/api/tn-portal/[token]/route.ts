import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const result = await query(
    `SELECT t.*, a.vorname, a.nachname, a.email, a.status as anmelde_status,
     a.kurs_id, a.ernaehrung, a.anmerkungen,
     k.name as kurs_name, k.start_datum, k.end_datum, k.ort, k.beschreibung as kurs_beschreibung
     FROM tn_tokens t
     JOIN anmeldungen a ON t.anmeldung_id = a.id
     JOIN kurse k ON a.kurs_id = k.id
     WHERE t.token = $1 AND t.expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Ungültiger oder abgelaufener Link" }, { status: 404 });
  }

  const data = result.rows[0];

  // Load programm
  const programm = await query(
    `SELECT p.tag_nummer, p.tag_titel, pb.start_zeit, pb.end_zeit, pb.titel, pb.typ, pb.raum
     FROM programm p JOIN programm_block pb ON pb.programm_id = p.id
     WHERE p.kurs_id = $1 AND p.variante_id IS NULL
     ORDER BY p.tag_nummer, pb.start_zeit`,
    [data.kurs_id]
  );

  // Load fahrgemeinschaften
  const fahrgemeinschaften = await query(
    `SELECT f.*,
     (SELECT COUNT(*) FROM fahrgemeinschaft_mitglieder WHERE fahrgemeinschaft_id = f.id AND status = 'bestaetigt') as belegte_plaetze
     FROM fahrgemeinschaften f WHERE f.kurs_id = $1 ORDER BY f.abfahrtszeit`,
    [data.kurs_id]
  );

  return NextResponse.json({
    anmeldung: {
      vorname: data.vorname, nachname: data.nachname,
      email: data.email, status: data.anmelde_status,
      ernaehrung: data.ernaehrung,
    },
    kurs: {
      id: data.kurs_id, name: data.kurs_name,
      start_datum: data.start_datum, end_datum: data.end_datum,
      ort: data.ort, beschreibung: data.kurs_beschreibung,
    },
    programm: programm.rows,
    fahrgemeinschaften: fahrgemeinschaften.rows,
  });
}
