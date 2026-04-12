import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;

  // Load buckets
  let buckets = await query(
    "SELECT * FROM buckets WHERE kurs_id = $1 ORDER BY sortierung, id",
    [kursId]
  );

  // Auto-create default buckets if none exist
  if (buckets.rows.length === 0) {
    const defaults = [
      { name: "Orga", farbe: "#003056" },
      { name: "Inhalt", farbe: "#0891b2" },
      { name: "Finanzierung", farbe: "#b45309" },
      { name: "Teilgeber*innen", farbe: "#7c3aed" },
    ];
    for (let i = 0; i < defaults.length; i++) {
      await query(
        "INSERT INTO buckets (kurs_id, name, farbe, sortierung) VALUES ($1, $2, $3, $4)",
        [kursId, defaults[i].name, defaults[i].farbe, i]
      );
    }
    buckets = await query(
      "SELECT * FROM buckets WHERE kurs_id = $1 ORDER BY sortierung, id",
      [kursId]
    );
  }

  // Load aufgaben
  const aufgaben = await query(
    `SELECT a.*, u.name as zugewiesen_an_name
     FROM aufgaben a LEFT JOIN users u ON a.zugewiesen_an = u.id
     WHERE a.kurs_id = $1
     ORDER BY a.sortierung, a.id`,
    [kursId]
  );

  return NextResponse.json({ buckets: buckets.rows, aufgaben: aufgaben.rows });
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
      [kursId, body.parent_id || null, body.titel, body.beschreibung || null,
       body.zugewiesen_an || null, body.zugewiesen_name || null, body.status || "offen",
       body.prioritaet || "mittel", body.deadline || null, body.phase || null]
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

  // Bucket actions
  if (body.action === "create_bucket") {
    const count = await query("SELECT COUNT(*) FROM buckets WHERE kurs_id = $1", [kursId]);
    const result = await query(
      "INSERT INTO buckets (kurs_id, name, farbe, sortierung) VALUES ($1, $2, $3, $4) RETURNING *",
      [kursId, body.name || "Neuer Bucket", body.farbe || "#5c5850", Number(count.rows[0].count)]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  }

  if (body.action === "update_bucket") {
    await query("UPDATE buckets SET name = $1, farbe = $2 WHERE id = $3", [body.name, body.farbe, body.bucket_id]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_bucket") {
    // Move tasks to first remaining bucket or set phase to null
    await query("UPDATE aufgaben SET phase = NULL WHERE kurs_id = $1 AND phase = (SELECT name FROM buckets WHERE id = $2)", [kursId, body.bucket_id]);
    await query("DELETE FROM buckets WHERE id = $1", [body.bucket_id]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
