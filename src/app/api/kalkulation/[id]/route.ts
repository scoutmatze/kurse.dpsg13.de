import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// GET kalkulation by kurs_id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id: kursId } = await params;

  // Get or create kalkulation
  let kalk = await query(
    "SELECT * FROM kalkulation WHERE kurs_id = $1 AND ist_aktiv = true ORDER BY version DESC LIMIT 1",
    [kursId]
  );

  if (kalk.rows.length === 0) {
    // Auto-create
    kalk = await query(
      "INSERT INTO kalkulation (kurs_id) VALUES ($1) RETURNING *",
      [kursId]
    );

    // Insert default posten
    const kalkId = kalk.rows[0].id;
    const defaults = [
      ["ausgabe", "reise", "Fahrtkosten Team (Vorbereitung)", 100, false, null, "vorbereitung"],
      ["ausgabe", "material", "Druckkosten Einladung/Flyer", 80, false, null, "vorbereitung"],
      ["ausgabe", "unterkunft", "Übernachtung (automatisch)", 0, true, "ue", "kurs"],
      ["ausgabe", "unterkunft", "Verpflegung (automatisch)", 0, true, "vp", "kurs"],
      ["ausgabe", "material", "Bastelmaterial", 150, false, null, "kurs"],
      ["ausgabe", "reise", "Fahrtkosten Team (Anreise)", 200, false, null, "kurs"],
      ["ausgabe", "material", "Teilnahmebescheinigungen/Druck", 50, false, null, "nachbereitung"],
      ["einnahme", "zuschuss", "Zuschuss KJR", 0, false, null, "kurs"],
      ["einnahme", "zuschuss", "Zuschuss BJR", 0, false, null, "kurs"],
      ["einnahme", "eigenanteil", "Eigenanteil DV", 0, false, null, "kurs"],
    ];

    for (let i = 0; i < defaults.length; i++) {
      const [typ, kat, bez, betrag, auto, autoTyp, phase] = defaults[i];
      await query(
        `INSERT INTO kalkulation_posten (kalkulation_id, typ, kategorie, bezeichnung, betrag, ist_auto, auto_typ, sortierung, phase)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [kalkId, typ, kat, bez, betrag, auto, autoTyp, i, phase || "kurs"]
      );
    }
  }

  const kalkulation = kalk.rows[0];
  const posten = await query(
    "SELECT * FROM kalkulation_posten WHERE kalkulation_id = $1 ORDER BY phase, sortierung, id",
    [kalkulation.id]
  );

  return NextResponse.json({ ...kalkulation, posten: posten.rows });
}

// PUT update kalkulation
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id: kursId } = await params;
  const body = await req.json();

  // Update kalkulation header
  if (body.ue_pro_nacht !== undefined || body.vp_pro_tag !== undefined ||
      body.tn_beitrag !== undefined || body.auto_calc_beitrag !== undefined) {
    await query(
      `UPDATE kalkulation SET ue_pro_nacht = COALESCE($1, ue_pro_nacht),
       vp_pro_tag = COALESCE($2, vp_pro_tag), tn_beitrag = COALESCE($3, tn_beitrag),
       auto_calc_beitrag = COALESCE($4, auto_calc_beitrag), updated_at = NOW()
       WHERE kurs_id = $5 AND ist_aktiv = true`,
      [body.ue_pro_nacht, body.vp_pro_tag, body.tn_beitrag, body.auto_calc_beitrag, kursId]
    );
  }

  // Update posten
  if (body.posten) {
    const kalk = await query(
      "SELECT id FROM kalkulation WHERE kurs_id = $1 AND ist_aktiv = true LIMIT 1",
      [kursId]
    );
    if (kalk.rows.length > 0) {
      const kalkId = kalk.rows[0].id;
      // Delete old and re-insert
      await query("DELETE FROM kalkulation_posten WHERE kalkulation_id = $1", [kalkId]);
      for (let i = 0; i < body.posten.length; i++) {
        const p = body.posten[i];
        await query(
          `INSERT INTO kalkulation_posten (kalkulation_id, typ, kategorie, bezeichnung, betrag, ist_auto, auto_typ, sortierung, phase, nummer, ist_gruppe, parent_posten_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [kalkId, p.typ, p.kategorie, p.bezeichnung, p.betrag || 0, p.ist_auto || false, p.auto_typ, i, p.phase || "kurs", p.nummer || null, p.ist_gruppe || false, p.parent_posten_id || null]
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
