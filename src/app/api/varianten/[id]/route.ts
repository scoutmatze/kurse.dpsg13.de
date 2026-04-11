import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // If setting as active, deactivate others first
  if (body.ist_aktiv === true) {
    const v = await query("SELECT kurs_id FROM varianten WHERE id = $1", [id]);
    if (v.rows.length > 0) {
      await query("UPDATE varianten SET ist_aktiv = false WHERE kurs_id = $1", [v.rows[0].kurs_id]);
    }
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of ["name", "beschreibung", "ist_aktiv", "tn_anzahl", "teamende_anzahl",
    "naechte", "team_vorlauf", "haus_id", "verpflegung", "ue_pro_nacht", "vp_pro_tag", "farbe"]) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(body[key]);
      idx++;
    }
  }

  if (fields.length === 0) return NextResponse.json({ error: "Nichts zu aktualisieren" }, { status: 400 });

  fields.push("updated_at = NOW()");
  values.push(id);

  const result = await query(
    `UPDATE varianten SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  await query("DELETE FROM varianten WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
