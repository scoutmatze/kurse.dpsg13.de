import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id: sourceId } = await params;
  const body = await req.json();
  const newName = body.name || "Kopie";

  // Get source kurs
  const src = await query("SELECT * FROM kurse WHERE id = $1", [sourceId]);
  if (src.rows.length === 0) return NextResponse.json({ error: "Kurs nicht gefunden" }, { status: 404 });
  const s = src.rows[0];

  // Create new kurs
  const newKurs = await query(
    `INSERT INTO kurse (name, beschreibung, status, team_vorlauf_tage, ort, haus_id, verpflegung, max_teilnehmende, created_by)
     VALUES ($1, $2, 'planung', $3, $4, $5, $6, $7, $8) RETURNING *`,
    [newName, s.beschreibung, s.team_vorlauf_tage, s.ort, s.haus_id, s.verpflegung, s.max_teilnehmende, user.userId]
  );
  const newId = newKurs.rows[0].id;

  // Clone buckets
  const buckets = await query("SELECT * FROM buckets WHERE kurs_id = $1 ORDER BY sortierung", [sourceId]);
  for (const b of buckets.rows) {
    await query(
      "INSERT INTO buckets (kurs_id, name, farbe, sortierung) VALUES ($1, $2, $3, $4)",
      [newId, b.name, b.farbe, b.sortierung]
    );
  }

  // Clone aufgaben (reset status, remove assignments)
  if (body.clone_aufgaben) {
    const aufgaben = await query(
      "SELECT * FROM aufgaben WHERE kurs_id = $1 AND parent_id IS NULL ORDER BY sortierung, id",
      [sourceId]
    );
    for (const a of aufgaben.rows) {
      const newA = await query(
        `INSERT INTO aufgaben (kurs_id, titel, beschreibung, status, prioritaet, phase, sortierung)
         VALUES ($1, $2, $3, 'offen', $4, $5, $6) RETURNING id`,
        [newId, a.titel, a.beschreibung, a.prioritaet, a.phase, a.sortierung]
      );
      // Clone subtasks
      const subs = await query("SELECT * FROM aufgaben WHERE parent_id = $1", [a.id]);
      for (const sub of subs.rows) {
        await query(
          `INSERT INTO aufgaben (kurs_id, parent_id, titel, beschreibung, status, prioritaet, phase)
           VALUES ($1, $2, $3, $4, 'offen', $5, $6)`,
          [newId, newA.rows[0].id, sub.titel, sub.beschreibung, sub.prioritaet, sub.phase]
        );
      }
    }
  }

  // Clone team roles (without names/contacts)
  if (body.clone_team) {
    const team = await query("SELECT * FROM kurs_team WHERE kurs_id = $1", [sourceId]);
    for (const t of team.rows) {
      await query(
        "INSERT INTO kurs_team (kurs_id, rolle, rechte, name, email) VALUES ($1, $2, $3, $4, $5)",
        [newId, t.rolle, t.rechte, t.name, t.email]
      );
    }
  }

  // Clone kalkulation
  if (body.clone_kalkulation) {
    const kalk = await query(
      "SELECT * FROM kalkulation WHERE kurs_id = $1 AND ist_aktiv = true LIMIT 1",
      [sourceId]
    );
    if (kalk.rows.length > 0) {
      const newKalk = await query(
        "INSERT INTO kalkulation (kurs_id, ue_pro_nacht, vp_pro_tag, auto_calc_beitrag) VALUES ($1, $2, $3, $4) RETURNING id",
        [newId, kalk.rows[0].ue_pro_nacht, kalk.rows[0].vp_pro_tag, kalk.rows[0].auto_calc_beitrag]
      );
      await query(
        `INSERT INTO kalkulation_posten (kalkulation_id, typ, kategorie, bezeichnung, betrag, ist_auto, auto_typ, sortierung, phase, ist_gruppe)
         SELECT $1, typ, kategorie, bezeichnung, betrag, ist_auto, auto_typ, sortierung, phase, ist_gruppe
         FROM kalkulation_posten WHERE kalkulation_id = $2`,
        [newKalk.rows[0].id, kalk.rows[0].id]
      );
    }
  }

  // Clone programm
  if (body.clone_programm) {
    const tage = await query(
      "SELECT * FROM programm WHERE kurs_id = $1 AND variante_id IS NULL ORDER BY tag_nummer",
      [sourceId]
    );
    for (const tag of tage.rows) {
      const newTag = await query(
        "INSERT INTO programm (kurs_id, tag_nummer, tag_titel) VALUES ($1, $2, $3) RETURNING id",
        [newId, tag.tag_nummer, tag.tag_titel]
      );
      await query(
        `INSERT INTO programm_block (programm_id, start_zeit, end_zeit, titel, beschreibung, raum, verantwortlich, typ, farbe, sortierung)
         SELECT $1, start_zeit, end_zeit, titel, beschreibung, raum, verantwortlich, typ, farbe, sortierung
         FROM programm_block WHERE programm_id = $2`,
        [newTag.rows[0].id, tag.id]
      );
    }
  }

  return NextResponse.json(newKurs.rows[0], { status: 201 });
}
