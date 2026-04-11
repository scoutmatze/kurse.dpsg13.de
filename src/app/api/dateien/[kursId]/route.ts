import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = "/app/uploads";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;
  const result = await query(
    `SELECT d.*, u.name as hochgeladen_von_name
     FROM dateien d LEFT JOIN users u ON d.hochgeladen_von = u.id
     WHERE d.kurs_id = $1 ORDER BY d.created_at DESC`,
    [kursId]
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const kategorie = (formData.get("kategorie") as string) || "sonstiges";

  if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Datei zu groß (max. 10MB)" }, { status: 400 });

  const dir = path.join(UPLOAD_DIR, kursId);
  await mkdir(dir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;
  const filePath = path.join(dir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const result = await query(
    `INSERT INTO dateien (kurs_id, name, pfad, mime_type, groesse, kategorie, hochgeladen_von)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [kursId, file.name, filePath, file.type, file.size, kategorie, user.userId]
  );

  return NextResponse.json(result.rows[0], { status: 201 });
}
