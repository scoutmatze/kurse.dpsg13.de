import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const hausId = req.nextUrl.searchParams.get("hausId");
  const kursId = req.nextUrl.searchParams.get("kursId");

  let q = "SELECT * FROM raeume WHERE 1=1";
  const params: unknown[] = [];

  if (hausId) {
    params.push(hausId);
    q += ` AND haus_id = $${params.length}`;
  }
  if (kursId) {
    params.push(kursId);
    q += ` AND (haus_id IN (SELECT haus_id FROM kurse WHERE id = $${params.length}) OR haus_id IS NULL)`;
  }

  q += " ORDER BY name";
  const result = await query(q, params);
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const result = await query(
    `INSERT INTO raeume (haus_id, name, kapazitaet, ausstattung, stockwerk, notizen)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [body.haus_id, body.name, body.kapazitaet || null, body.ausstattung, body.stockwerk, body.notizen]
  );
  return NextResponse.json(result.rows[0], { status: 201 });
}
