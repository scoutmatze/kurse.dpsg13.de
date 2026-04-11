import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const result = await query(
    `SELECT k.*, u.name as ersteller_name,
     (SELECT COUNT(*) FROM anmeldungen WHERE kurs_id = k.id) as tn_count,
     (SELECT COUNT(*) FROM kurs_team WHERE kurs_id = k.id) as team_count
     FROM kurse k LEFT JOIN users u ON k.created_by = u.id
     WHERE k.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Kurs nicht gefunden" }, { status: 404 });
  }
  return NextResponse.json(result.rows[0]);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of ["name", "beschreibung", "status", "start_datum", "end_datum",
    "team_vorlauf_tage", "ort", "haus_id", "verpflegung", "max_teilnehmende"]) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(body[key]);
      idx++;
    }
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: "Keine Felder zum Aktualisieren" }, { status: 400 });
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE kurse SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  await query("DELETE FROM kurse WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
