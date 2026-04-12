import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// Sync aufgaben to user's Todoist
export async function POST(req: NextRequest) {
  const user = await verifyToken();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  // Get user's todoist token
  const userResult = await query("SELECT todoist_token FROM users WHERE id = $1", [user.userId]);
  const token = userResult.rows[0]?.todoist_token;
  if (!token) return NextResponse.json({ error: "Todoist nicht verbunden" }, { status: 400 });

  const body = await req.json();
  const { kurs_id, aufgabe_ids } = body;

  // Get kurs name for project
  const kurs = await query("SELECT name FROM kurse WHERE id = $1", [kurs_id]);
  const kursName = kurs.rows[0]?.name || "DPSG Kurs";

  // Create or find Todoist project
  let projectId: string | null = null;
  try {
    const projectsRes = await fetch("https://api.todoist.com/rest/v2/projects", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const projects = await projectsRes.json();
    const existing = projects.find((p: any) => p.name === `DPSG: ${kursName}`);

    if (existing) {
      projectId = existing.id;
    } else {
      const createRes = await fetch("https://api.todoist.com/rest/v2/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: `DPSG: ${kursName}` }),
      });
      const newProject = await createRes.json();
      projectId = newProject.id;
    }
  } catch (err) {
    return NextResponse.json({ error: "Todoist-Verbindung fehlgeschlagen" }, { status: 502 });
  }

  // Get aufgaben to sync
  // Sync parent tasks first, then subtasks
  const parents = await query(
    `SELECT * FROM aufgaben WHERE kurs_id = $1 AND parent_id IS NULL AND todoist_id IS NULL AND status != 'erledigt' ${aufgabe_ids ? "AND id = ANY($2)" : ""}`,
    aufgabe_ids ? [kurs_id, aufgabe_ids] : [kurs_id]
  );

  const synced: number[] = [];

  for (const a of parents.rows) {
    try {
      const priority = ({ niedrig: 1, mittel: 2, hoch: 3, dringend: 4 } as Record<string, number>)[a.prioritaet] || 2;

      const taskRes = await fetch("https://api.todoist.com/rest/v2/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          content: a.titel,
          description: a.beschreibung || "",
          project_id: projectId,
          priority,
          due_date: a.deadline || undefined,
          labels: [a.phase || "allgemein"].filter(Boolean),
        }),
      });

      if (taskRes.ok) {
        const task = await taskRes.json();
        await query("UPDATE aufgaben SET todoist_id = $1 WHERE id = $2", [task.id, a.id]);
        synced.push(a.id);

        // Sync subtasks
        const subs = await query(
          "SELECT * FROM aufgaben WHERE parent_id = $1 AND todoist_id IS NULL AND status != 'erledigt'",
          [a.id]
        );

        for (const sub of subs.rows) {
          try {
            const subRes = await fetch("https://api.todoist.com/rest/v2/tasks", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                content: sub.titel,
                description: sub.beschreibung || "",
                project_id: projectId,
                parent_id: task.id,
                due_date: sub.deadline || undefined,
              }),
            });

            if (subRes.ok) {
              const subTask = await subRes.json();
              await query("UPDATE aufgaben SET todoist_id = $1 WHERE id = $2", [subTask.id, sub.id]);
              synced.push(sub.id);
            }
          } catch {}
        }
      }
    } catch {}
  }

  return NextResponse.json({ synced: synced.length, project: projectId });
}
