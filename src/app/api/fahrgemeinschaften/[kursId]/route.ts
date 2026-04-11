import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// Public API — accessible with TN token
export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const { kursId } = await params;

  const result = await query(
    `SELECT f.*, 
     (SELECT COUNT(*) FROM fahrgemeinschaft_mitglieder WHERE fahrgemeinschaft_id = f.id AND status = 'bestaetigt') as belegte_plaetze
     FROM fahrgemeinschaften f WHERE f.kurs_id = $1 ORDER BY f.abfahrtszeit`,
    [kursId]
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const { kursId } = await params;
  const body = await req.json();

  if (body.action === "create") {
    const result = await query(
      `INSERT INTO fahrgemeinschaften (kurs_id, erstellt_von, richtung, abfahrtsort, abfahrtszeit, plaetze_gesamt, beschreibung, kontakt_name, kontakt_telefon)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [kursId, body.anmeldung_id, body.richtung || "hin", body.abfahrtsort,
       body.abfahrtszeit, body.plaetze_gesamt || 4, body.beschreibung,
       body.kontakt_name, body.kontakt_telefon]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  }

  if (body.action === "join") {
    const result = await query(
      `INSERT INTO fahrgemeinschaft_mitglieder (fahrgemeinschaft_id, anmeldung_id, name, status)
       VALUES ($1,$2,$3,'angefragt') RETURNING *`,
      [body.fahrgemeinschaft_id, body.anmeldung_id, body.name]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  }

  if (body.action === "confirm") {
    await query(
      "UPDATE fahrgemeinschaft_mitglieder SET status = 'bestaetigt' WHERE id = $1",
      [body.mitglied_id]
    );
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    await query("DELETE FROM fahrgemeinschaften WHERE id = $1", [body.fahrgemeinschaft_id]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
