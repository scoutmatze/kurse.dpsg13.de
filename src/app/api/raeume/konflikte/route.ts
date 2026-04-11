import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const kursId = req.nextUrl.searchParams.get("kursId");
  if (!kursId) return NextResponse.json({ error: "kursId erforderlich" }, { status: 400 });

  // Find overlapping blocks in the same room
  const result = await query(
    `SELECT
       b1.id as block1_id, b1.titel as block1_titel, b1.start_zeit as block1_start, b1.end_zeit as block1_end,
       b2.id as block2_id, b2.titel as block2_titel, b2.start_zeit as block2_start, b2.end_zeit as block2_end,
       b1.raum, p1.tag_nummer
     FROM programm_block b1
     JOIN programm_block b2 ON b1.id < b2.id
       AND b1.raum = b2.raum AND b1.raum IS NOT NULL AND b1.raum != ''
     JOIN programm p1 ON b1.programm_id = p1.id
     JOIN programm p2 ON b2.programm_id = p2.id
     WHERE p1.kurs_id = $1 AND p2.kurs_id = $1
       AND p1.tag_nummer = p2.tag_nummer
       AND p1.variante_id IS NOT DISTINCT FROM p2.variante_id
       AND b1.start_zeit < b2.end_zeit AND b2.start_zeit < b1.end_zeit
     ORDER BY p1.tag_nummer, b1.start_zeit`,
    [kursId]
  );

  return NextResponse.json({
    konflikte: result.rows,
    anzahl: result.rows.length,
  });
}
