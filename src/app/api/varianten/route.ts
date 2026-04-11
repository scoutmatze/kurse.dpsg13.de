import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// GET all varianten for a kurs (query param: kursId)
export async function GET(req: NextRequest) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const kursId = req.nextUrl.searchParams.get("kursId");
  if (!kursId) return NextResponse.json({ error: "kursId erforderlich" }, { status: 400 });

  const result = await query(
    "SELECT * FROM varianten WHERE kurs_id = $1 ORDER BY sortierung, id",
    [kursId]
  );
  return NextResponse.json(result.rows);
}

// POST create new variante (or clone from existing)
export async function POST(req: NextRequest) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const { kurs_id, name, clone_from } = body;

  if (clone_from) {
    // Clone existing variante
    const src = await query("SELECT * FROM varianten WHERE id = $1", [clone_from]);
    if (src.rows.length === 0) return NextResponse.json({ error: "Quell-Variante nicht gefunden" }, { status: 404 });

    const s = src.rows[0];
    const result = await query(
      `INSERT INTO varianten (kurs_id, name, tn_anzahl, teamende_anzahl, naechte, team_vorlauf, haus_id, verpflegung, ue_pro_nacht, vp_pro_tag, farbe)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [s.kurs_id, name || s.name + " (Kopie)", s.tn_anzahl, s.teamende_anzahl, s.naechte, s.team_vorlauf,
       s.haus_id, s.verpflegung, s.ue_pro_nacht, s.vp_pro_tag, s.farbe]
    );
    const newVar = result.rows[0];

    // Clone kalkulation posten
    const srcKalk = await query(
      "SELECT id FROM kalkulation WHERE variante_id = $1 AND ist_aktiv = true LIMIT 1",
      [clone_from]
    );
    if (srcKalk.rows.length > 0) {
      const newKalk = await query(
        "INSERT INTO kalkulation (kurs_id, variante_id) VALUES ($1, $2) RETURNING id",
        [s.kurs_id, newVar.id]
      );
      await query(
        `INSERT INTO kalkulation_posten (kalkulation_id, typ, kategorie, bezeichnung, betrag, ist_auto, auto_typ, sortierung)
         SELECT $1, typ, kategorie, bezeichnung, betrag, ist_auto, auto_typ, sortierung
         FROM kalkulation_posten WHERE kalkulation_id = $2`,
        [newKalk.rows[0].id, srcKalk.rows[0].id]
      );
    }

    // Clone programm blocks
    const srcProgs = await query(
      "SELECT * FROM programm WHERE variante_id = $1 ORDER BY tag_nummer",
      [clone_from]
    );
    for (const prog of srcProgs.rows) {
      const newProg = await query(
        "INSERT INTO programm (kurs_id, variante_id, tag_nummer, tag_titel) VALUES ($1,$2,$3,$4) RETURNING id",
        [s.kurs_id, newVar.id, prog.tag_nummer, prog.tag_titel]
      );
      await query(
        `INSERT INTO programm_block (programm_id, start_zeit, end_zeit, titel, beschreibung, raum, verantwortlich, typ, farbe, sortierung)
         SELECT $1, start_zeit, end_zeit, titel, beschreibung, raum, verantwortlich, typ, farbe, sortierung
         FROM programm_block WHERE programm_id = $2`,
        [newProg.rows[0].id, prog.id]
      );
    }

    return NextResponse.json(newVar, { status: 201 });
  }

  // New empty variante
  const colors = ["#003056", "#8b0a1e", "#0891b2", "#7c3aed", "#b45309", "#15803d"];
  const count = await query("SELECT COUNT(*) FROM varianten WHERE kurs_id = $1", [kurs_id]);
  const colorIdx = Number(count.rows[0].count) % colors.length;

  const result = await query(
    `INSERT INTO varianten (kurs_id, name, tn_anzahl, teamende_anzahl, naechte, team_vorlauf, haus_id, verpflegung, ue_pro_nacht, vp_pro_tag, farbe)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [kurs_id, name || "Neue Variante", body.tn_anzahl || 25, body.teamende_anzahl || 6,
     body.naechte || 7, body.team_vorlauf || 1, body.haus_id, body.verpflegung || "vp",
     body.ue_pro_nacht || 0, body.vp_pro_tag || 0, colors[colorIdx]]
  );

  return NextResponse.json(result.rows[0], { status: 201 });
}
