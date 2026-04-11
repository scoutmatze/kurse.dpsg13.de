import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// Fallback: Eingebaute Häuser-Liste wenn DB leer
const BUILTIN_HAEUSER = [
  { name: "Burg Schwaneck", region: "Oberbayern", uebernachtung: 18, vollpension: 38, halbpension: 28, selbstversorger: 12 },
  { name: "Max-Mannheimer-Haus", region: "Oberbayern", uebernachtung: 22, vollpension: 42, halbpension: 32, selbstversorger: 14 },
  { name: "Jugendsiedlung Hochland", region: "Oberbayern", uebernachtung: 16, vollpension: 35, halbpension: 25, selbstversorger: 10 },
  { name: "Haus am Sudelfeld", region: "Oberbayern", uebernachtung: 20, vollpension: 40, halbpension: 30, selbstversorger: 15 },
  { name: "Jugendhaus Josefstal", region: "Oberbayern", uebernachtung: 24, vollpension: 45, halbpension: 35, selbstversorger: 16 },
  { name: "Don Bosco Haus", region: "München", uebernachtung: 15, vollpension: 32, halbpension: 22, selbstversorger: 9 },
  { name: "Haus Königsdorf", region: "Oberbayern", uebernachtung: 19, vollpension: 36, halbpension: 26, selbstversorger: 11 },
  { name: "Aktionszentrum Benediktbeuern", region: "Oberbayern", uebernachtung: 21, vollpension: 39, halbpension: 29, selbstversorger: 13 },
];

export async function GET() {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const result = await query("SELECT * FROM haeuser ORDER BY name");

  if (result.rows.length === 0) {
    return NextResponse.json(BUILTIN_HAEUSER.map((h, i) => ({ id: i + 1, ...h })));
  }
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const result = await query(
    `INSERT INTO haeuser (name, region, adresse, url, uebernachtung, vollpension, halbpension, selbstversorger, max_personen, notizen, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [body.name, body.region, body.adresse, body.url, body.uebernachtung || 0,
     body.vollpension || 0, body.halbpension || 0, body.selbstversorger || 0,
     body.max_personen, body.notizen, user.userId]
  );
  return NextResponse.json(result.rows[0], { status: 201 });
}
