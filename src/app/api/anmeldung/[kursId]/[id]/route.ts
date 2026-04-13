import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ kursId: string; id: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of ["status", "bezahlt", "bezahlt_am", "funktion", "bundesland", "anmerkungen"]) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(body[key]);
      idx++;
    }
  }

  if (fields.length === 0) return NextResponse.json({ error: "Nichts zu aktualisieren" }, { status: 400 });

  fields.push("updated_at = NOW()");
  values.push(id);

  const result = await query(
    `UPDATE anmeldungen SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ kursId: string; id: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  await query("DELETE FROM anmeldungen WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
