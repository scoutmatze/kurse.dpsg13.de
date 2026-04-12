import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const kurse = await query("SELECT COUNT(*) FROM kurse");
  const aktiveKurse = await query("SELECT COUNT(*) FROM kurse WHERE status IN ('planung', 'ausgeschrieben', 'laufend')");
  const anmeldungen = await query("SELECT COUNT(*) FROM anmeldungen WHERE status != 'storniert'");
  const offeneAufgaben = await query("SELECT COUNT(*) FROM aufgaben WHERE status != 'erledigt'");
  const ueberfaellig = await query(
    "SELECT COUNT(*) FROM aufgaben WHERE deadline < NOW() AND status != 'erledigt'"
  );

  // Nächster Kurs
  const naechster = await query(
    "SELECT name, start_datum, ort FROM kurse WHERE start_datum >= CURRENT_DATE AND status != 'archiviert' ORDER BY start_datum LIMIT 1"
  );

  // Letzte Anmeldungen
  const letzteAnmeldungen = await query(
    `SELECT a.vorname, a.nachname, a.created_at, k.name as kurs_name
     FROM anmeldungen a JOIN kurse k ON a.kurs_id = k.id
     ORDER BY a.created_at DESC LIMIT 5`
  );

  return NextResponse.json({
    kurse: Number(kurse.rows[0].count),
    aktive_kurse: Number(aktiveKurse.rows[0].count),
    anmeldungen: Number(anmeldungen.rows[0].count),
    offene_aufgaben: Number(offeneAufgaben.rows[0].count),
    ueberfaellige_aufgaben: Number(ueberfaellig.rows[0].count),
    naechster_kurs: naechster.rows[0] || null,
    letzte_anmeldungen: letzteAnmeldungen.rows,
  });
}
