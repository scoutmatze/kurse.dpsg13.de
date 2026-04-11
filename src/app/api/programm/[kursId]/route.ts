import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;
  const varianteId = req.nextUrl.searchParams.get("varianteId");

  let progQuery = "SELECT * FROM programm WHERE kurs_id = $1";
  const progParams: unknown[] = [kursId];

  if (varianteId) {
    progQuery += " AND variante_id = $2";
    progParams.push(varianteId);
  } else {
    progQuery += " AND variante_id IS NULL";
  }
  progQuery += " ORDER BY tag_nummer";

  const tage = await query(progQuery, progParams);

  // Load blocks for each tag
  const result = [];
  for (const tag of tage.rows) {
    const blocks = await query(
      "SELECT * FROM programm_block WHERE programm_id = $1 ORDER BY start_zeit, sortierung",
      [tag.id]
    );
    result.push({ ...tag, blocks: blocks.rows });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;
  const body = await req.json();

  if (body.action === "init_tage") {
    // Initialize days for a kurs
    const anzahlTage = body.anzahl_tage || 8;
    const varianteId = body.variante_id || null;

    for (let i = 1; i <= anzahlTage; i++) {
      const exists = await query(
        "SELECT id FROM programm WHERE kurs_id = $1 AND tag_nummer = $2 AND variante_id IS NOT DISTINCT FROM $3",
        [kursId, i, varianteId]
      );
      if (exists.rows.length === 0) {
        await query(
          "INSERT INTO programm (kurs_id, variante_id, tag_nummer, tag_titel) VALUES ($1,$2,$3,$4)",
          [kursId, varianteId, i, `Tag ${i}`]
        );
      }
    }
    return NextResponse.json({ ok: true, tage: anzahlTage });
  }

  if (body.action === "add_block") {
    const result = await query(
      `INSERT INTO programm_block (programm_id, start_zeit, end_zeit, titel, beschreibung, raum, verantwortlich, typ, farbe, sortierung)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [body.programm_id, body.start_zeit, body.end_zeit, body.titel || "Neuer Block",
       body.beschreibung, body.raum, body.verantwortlich, body.typ || "programm",
       body.farbe, body.sortierung || 0]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  }

  if (body.action === "update_block") {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const key of ["start_zeit", "end_zeit", "titel", "beschreibung", "raum", "verantwortlich", "typ", "farbe", "sortierung"]) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(body[key]);
        idx++;
      }
    }

    values.push(body.block_id);
    await query(`UPDATE programm_block SET ${fields.join(", ")} WHERE id = $${idx}`, values);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_block") {
    await query("DELETE FROM programm_block WHERE id = $1", [body.block_id]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update_tag") {
    await query("UPDATE programm SET tag_titel = $1 WHERE id = $2", [body.tag_titel, body.tag_id]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
