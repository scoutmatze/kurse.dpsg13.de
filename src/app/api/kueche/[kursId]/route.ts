import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { getKursPermissions } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;
  const perms = await getKursPermissions(user.userId, kursId);

  if (!perms.canViewAnmeldungen) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  // Küche sieht nur Ernährungsdaten, keine persönlichen Details
  if (perms.canViewFullAnmeldungen) {
    // Kursleitung+ sieht alles
    const result = await query(
      "SELECT vorname, nachname, ernaehrung, allergien, unvertraeglichkeiten, anmerkungen, status FROM anmeldungen WHERE kurs_id = $1 AND status != 'storniert' ORDER BY nachname",
      [kursId]
    );
    return NextResponse.json({ full: true, anmeldungen: result.rows });
  } else {
    // Küche sieht nur aggregiert + anonymisiert
    const result = await query(
      `SELECT ernaehrung, COUNT(*) as anzahl FROM anmeldungen WHERE kurs_id = $1 AND status != 'storniert' GROUP BY ernaehrung ORDER BY anzahl DESC`,
      [kursId]
    );
    const allergien = await query(
      `SELECT allergien, unvertraeglichkeiten FROM anmeldungen WHERE kurs_id = $1 AND status != 'storniert' AND (allergien IS NOT NULL AND allergien != '' OR unvertraeglichkeiten IS NOT NULL AND unvertraeglichkeiten != '')`,
      [kursId]
    );
    const gesamt = await query(
      "SELECT COUNT(*) FROM anmeldungen WHERE kurs_id = $1 AND status != 'storniert'",
      [kursId]
    );
    return NextResponse.json({
      full: false,
      gesamt: Number(gesamt.rows[0].count),
      ernaehrung: result.rows,
      allergien_liste: allergien.rows,
    });
  }
}
