import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  // Public access (TN portal) or authenticated
  const { kursId } = await params;

  const result = await query(
    "SELECT * FROM packliste WHERE kurs_id = $1 ORDER BY kategorie, sortierung, id",
    [kursId]
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ kursId: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kursId } = await params;
  const body = await req.json();

  if (body.action === "add") {
    const result = await query(
      "INSERT INTO packliste (kurs_id, titel, kategorie, pflicht, sortierung) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [kursId, body.titel, body.kategorie || "Allgemein", body.pflicht || false, body.sortierung || 0]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  }

  if (body.action === "update") {
    await query(
      "UPDATE packliste SET titel = $1, kategorie = $2, pflicht = $3 WHERE id = $4",
      [body.titel, body.kategorie, body.pflicht, body.item_id]
    );
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    await query("DELETE FROM packliste WHERE id = $1", [body.item_id]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "init_default") {
    const defaults = [
      { kategorie: "Kleidung", items: ["Regenjacke", "Festes Schuhwerk / Wanderschuhe", "Warmer Pullover", "Wechselkleidung", "Schlafanzug"] },
      { kategorie: "Schlafen", items: ["Schlafsack", "Isomatte (falls nötig)", "Kissen (optional)"] },
      { kategorie: "Hygiene", items: ["Zahnbürste + Zahnpasta", "Duschgel/Shampoo", "Handtuch", "Sonnencreme"] },
      { kategorie: "Für den Kurs", items: ["Schreibzeug", "Notizbuch", "Trinkflasche", "Taschenlampe"] },
      { kategorie: "Dokumente", items: ["Personalausweis", "Krankenversicherungskarte", "eFZ-Nachweis (falls nötig)"] },
      { kategorie: "Optional", items: ["Instrument", "Spiele", "Gute Laune!"] },
    ];

    let sort = 0;
    for (const group of defaults) {
      for (const item of group.items) {
        await query(
          "INSERT INTO packliste (kurs_id, titel, kategorie, pflicht, sortierung) VALUES ($1, $2, $3, $4, $5)",
          [kursId, item, group.kategorie, group.kategorie !== "Optional", sort++]
        );
      }
    }
    return NextResponse.json({ ok: true, count: sort });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
