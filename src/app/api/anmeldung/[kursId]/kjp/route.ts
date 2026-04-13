import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;

  const kurs = await query("SELECT name, start_datum, end_datum, ort FROM kurse WHERE id = $1", [kursId]);
  const kursData = kurs.rows[0];

  const result = await query(
    `SELECT vorname, nachname, geburtsdatum, bundesland, funktion, stamm
     FROM anmeldungen WHERE kurs_id = $1 AND status != 'storniert'
     ORDER BY nachname, vorname`,
    [kursId]
  );

  const headers = ["Nr.", "Nachname", "Vorname", "Geburtsdatum", "Bundesland", "Funktion/Aufgabe", "Stamm/Verband"];
  const lines = [
    `KJP-Teilnehmendenliste`,
    `Veranstaltung: ${kursData?.name || ""}`,
    `Zeitraum: ${kursData?.start_datum || ""} bis ${kursData?.end_datum || ""}`,
    `Ort: ${kursData?.ort || ""}`,
    ``,
    headers.join(";"),
  ];

  result.rows.forEach((row: any, i: number) => {
    const geb = row.geburtsdatum ? new Date(row.geburtsdatum).toLocaleDateString("de-DE") : "";
    lines.push([
      i + 1,
      row.nachname || "",
      row.vorname || "",
      geb,
      row.bundesland || "",
      row.funktion || "",
      row.stamm || "",
    ].join(";"));
  });

  lines.push("");
  lines.push(`Anzahl Teilnehmende: ${result.rows.length}`);

  const csv = "\uFEFF" + lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="KJP_Liste_${(kursData?.name || "Kurs").replace(/[^a-zA-Z0-9]/g, "_")}.csv"`,
    },
  });
}
