import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;
  const result = await query(
    "SELECT * FROM anmeldungen WHERE kurs_id = $1 ORDER BY nachname, vorname",
    [kursId]
  );

  const headers = ["Nachname", "Vorname", "E-Mail", "Telefon", "Geburtsdatum", "Stamm", "Bezirk", "Diözese",
    "Bundesland", "Straße", "PLZ", "Ort", "Ernährung", "Allergien", "Unverträglichkeiten",
    "eFZ vorhanden", "eFZ Datum", "Foto-Erlaubnis", "Funktion", "Status", "Bezahlt", "Anmerkungen", "Angemeldet am"];

  const keys = ["nachname", "vorname", "email", "telefon", "geburtsdatum", "stamm", "bezirk", "dioezese",
    "bundesland", "strasse", "plz", "ort", "ernaehrung", "allergien", "unvertraeglichkeiten",
    "efz_vorhanden", "efz_datum", "foto_erlaubnis", "funktion", "status", "bezahlt", "anmerkungen", "created_at"];

  const escape = (v: unknown) => {
    const s = String(v ?? "");
    if (s.includes(";") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const lines = [headers.join(";")];
  for (const row of result.rows) {
    lines.push(keys.map(k => escape((row as Record<string, unknown>)[k])).join(";"));
  }

  const csv = "\uFEFF" + lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="anmeldungen-kurs-${kursId}.csv"`,
    },
  });
}
