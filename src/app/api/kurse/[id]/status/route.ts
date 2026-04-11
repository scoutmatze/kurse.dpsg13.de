import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { getKursPermissions } from "@/lib/permissions";

const VALID_TRANSITIONS: Record<string, string[]> = {
  planung: ["ausgeschrieben"],
  ausgeschrieben: ["laufend", "planung"],
  laufend: ["abgeschlossen"],
  abgeschlossen: ["archiviert"],
  archiviert: [],
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const perms = await getKursPermissions(user.userId, id);
  if (!perms.canEditKurs) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { status: newStatus } = await req.json();

  // Get current status
  const current = await query("SELECT status FROM kurse WHERE id = $1", [id]);
  if (current.rows.length === 0) return NextResponse.json({ error: "Kurs nicht gefunden" }, { status: 404 });

  const currentStatus = current.rows[0].status;
  const allowed = VALID_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    return NextResponse.json({
      error: `Statuswechsel von "${currentStatus}" zu "${newStatus}" nicht erlaubt`,
      allowed,
    }, { status: 400 });
  }

  await query("UPDATE kurse SET status = $1, updated_at = NOW() WHERE id = $2", [newStatus, id]);

  // Log
  await query(
    "INSERT INTO audit_log (user_id, aktion, tabelle, datensatz_id, details) VALUES ($1,$2,$3,$4,$5)",
    [user.userId, "status_change", "kurse", id, JSON.stringify({ von: currentStatus, zu: newStatus })]
  );

  return NextResponse.json({ status: newStatus, previous: currentStatus });
}
