import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;
  const result = await query(
    `SELECT kt.*, u.name as user_name, u.email as user_email, u.avatar_url
     FROM kurs_team kt LEFT JOIN users u ON kt.user_id = u.id
     WHERE kt.kurs_id = $1 ORDER BY
       CASE kt.rolle WHEN 'kursleitung' THEN 1 WHEN 'referentin' THEN 2
       WHEN 'awareness' THEN 3 WHEN 'kueche' THEN 4 ELSE 5 END, kt.name`,
    [kursId]
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;
  const body = await req.json();

  if (body.action === "add") {
    const result = await query(
      `INSERT INTO kurs_team (kurs_id, user_id, rolle, name, email, telefon)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [kursId, body.user_id || null, body.rolle || "helfer",
       body.name, body.email, body.telefon]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  }

  if (body.action === "update") {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const key of ["rolle", "name", "email", "telefon"]) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(body[key]);
        idx++;
      }
    }
    values.push(body.member_id);
    await query(`UPDATE kurs_team SET ${fields.join(", ")} WHERE id = $${idx}`, values);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    await query("DELETE FROM kurs_team WHERE id = $1", [body.member_id]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
