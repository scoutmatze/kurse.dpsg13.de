import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;
  const result = await query(
    "SELECT * FROM anmeldungen WHERE kurs_id = $1 ORDER BY created_at DESC",
    [kursId]
  );
  return NextResponse.json(result.rows);
}
