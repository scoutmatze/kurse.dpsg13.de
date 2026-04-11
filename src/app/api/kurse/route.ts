import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const result = await query(
    `SELECT k.*, u.name as ersteller_name,
     (SELECT COUNT(*) FROM anmeldungen WHERE kurs_id = k.id) as tn_count
     FROM kurse k LEFT JOIN users u ON k.created_by = u.id
     ORDER BY k.created_at DESC`
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const result = await query(
    `INSERT INTO kurse (name, beschreibung, start_datum, end_datum, team_vorlauf_tage, ort, haus_id, verpflegung, max_teilnehmende, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [body.name, body.beschreibung, body.start_datum, body.end_datum,
     body.team_vorlauf_tage || 1, body.ort, body.haus_id, body.verpflegung || "vp",
     body.max_teilnehmende, user.userId]
  );
  return NextResponse.json(result.rows[0], { status: 201 });
}
