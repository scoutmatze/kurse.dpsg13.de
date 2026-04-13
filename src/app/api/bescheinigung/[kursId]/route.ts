import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;
  const anmeldungId = req.nextUrl.searchParams.get("anmeldungId");

  const kurs = await query("SELECT * FROM kurse WHERE id = $1", [kursId]);
  if (kurs.rows.length === 0) return NextResponse.json({ error: "Kurs nicht gefunden" }, { status: 404 });
  const k = kurs.rows[0];

  let anmeldungen;
  if (anmeldungId) {
    anmeldungen = await query("SELECT * FROM anmeldungen WHERE id = $1 AND kurs_id = $2", [anmeldungId, kursId]);
  } else {
    anmeldungen = await query(
      "SELECT * FROM anmeldungen WHERE kurs_id = $1 AND status IN ('bestaetigt', 'eingegangen') ORDER BY nachname",
      [kursId]
    );
  }

  const startDatum = k.start_datum ? new Date(k.start_datum).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }) : "";
  const endDatum = k.end_datum ? new Date(k.end_datum).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }) : "";

  // Generate simple HTML that can be printed as PDF
  const pages = anmeldungen.rows.map((a: any) => `
    <div style="page-break-after: always; padding: 60px; font-family: 'PT Sans Narrow', Arial, sans-serif; color: #1a1815;">
      <div style="text-align: center; margin-bottom: 40px;">
        <div style="background: #003056; color: white; padding: 16px 24px; border-radius: 8px; display: inline-block;">
          <div style="font-size: 24px; font-weight: bold;">Teilnahmebescheinigung</div>
        </div>
        <div style="height: 3px; background: #8b0a1e; margin-top: 4px;"></div>
      </div>

      <div style="font-size: 16px; line-height: 1.8; text-align: center; margin: 40px 0;">
        <p>Hiermit bestätigen wir, dass</p>
        <p style="font-size: 28px; font-weight: bold; margin: 16px 0; color: #003056;">
          ${a.vorname} ${a.nachname}
        </p>
        <p>an der Veranstaltung</p>
        <p style="font-size: 22px; font-weight: bold; margin: 16px 0; color: #003056;">
          ${k.name}
        </p>
        <p>vom <strong>${startDatum}</strong> bis <strong>${endDatum}</strong></p>
        <p>in <strong>${k.ort || "—"}</strong></p>
        <p style="margin-top: 8px;">teilgenommen hat.</p>
      </div>

      <div style="margin-top: 80px; display: flex; justify-content: space-between;">
        <div style="text-align: center; width: 200px;">
          <div style="border-top: 1px solid #1a1815; padding-top: 8px; font-size: 12px;">Ort, Datum</div>
        </div>
        <div style="text-align: center; width: 200px;">
          <div style="border-top: 1px solid #1a1815; padding-top: 8px; font-size: 12px;">Kursleitung</div>
        </div>
      </div>

      <div style="margin-top: 60px; text-align: center; font-size: 11px; color: #9e9a92;">
        Deutsche Pfadfinder*innenschaft Sankt Georg &middot; Gut Pfad!
      </div>
    </div>
  `).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Teilnahmebescheinigung - ${k.name}</title>
    <style>@page { margin: 0; size: A4; } body { margin: 0; } @media print { body { -webkit-print-color-adjust: exact; } }</style>
    </head><body>${pages}</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
