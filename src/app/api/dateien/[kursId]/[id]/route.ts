import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { readFile, unlink } from "fs/promises";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string; id: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const result = await query("SELECT * FROM dateien WHERE id = $1", [id]);
  if (result.rows.length === 0) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const datei = result.rows[0];
  try {
    const buffer = await readFile(datei.pfad);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": datei.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${datei.name}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ kursId: string; id: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const result = await query("SELECT pfad FROM dateien WHERE id = $1", [id]);
  if (result.rows.length > 0) {
    try { await unlink(result.rows[0].pfad); } catch {}
    await query("DELETE FROM dateien WHERE id = $1", [id]);
  }
  return NextResponse.json({ ok: true });
}
