import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;
  const result = await query(
    `SELECT a.*, u.name as zugewiesen_an_name
     FROM aufgaben a LEFT JOIN users u ON a.zugewiesen_an = u.id
     WHERE a.kurs_id = $1
     ORDER BY
       CASE a.phase WHEN 'vorbereitung' THEN 1 WHEN 'waehrend' THEN 2 WHEN 'nachbereitung' THEN 3 ELSE 4 END,
       CASE a.prioritaet WHEN 'dringend' THEN 1 WHEN 'hoch' THEN 2 WHEN 'mittel' THEN 3 WHEN 'niedrig' THEN 4 END,
       a.deadline NULLS LAST, a.sortierung, a.id`,
    [kursId]
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;
  const body = await req.json();

  if (body.action === "create") {
    const result = await query(
      `INSERT INTO aufgaben (kurs_id, parent_id, titel, beschreibung, zugewiesen_an, zugewiesen_name, status, prioritaet, deadline, phase)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [kursId, body.parent_id || null, body.titel, body.beschreibung,
       body.zugewiesen_an || null, body.zugewiesen_name, body.status || "offen",
       body.prioritaet || "mittel", body.deadline || null, body.phase || "vorbereitung"]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  }

  if (body.action === "update") {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const key of ["titel", "beschreibung", "zugewiesen_an", "zugewiesen_name", "status", "prioritaet", "deadline", "phase", "sortierung"]) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(body[key]);
        idx++;
      }
    }

    fields.push("updated_at = NOW()");
    values.push(body.aufgabe_id);
    await query(`UPDATE aufgaben SET ${fields.join(", ")} WHERE id = $${idx}`, values);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    await query("DELETE FROM aufgaben WHERE id = $1", [body.aufgabe_id]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
