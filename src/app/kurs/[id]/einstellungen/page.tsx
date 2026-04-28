"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Settings, Save, Loader2, Check, Trash2, AlertTriangle, Copy, ExternalLink
} from "lucide-react";

interface Kurs {
  id: number;
  name: string;
  beschreibung: string;
  status: string;
  start_datum: string;
  end_datum: string;
  ort: string;
  max_teilnehmende: number;
  team_vorlauf_tage: number;
  verpflegung: string;
}

export default function EinstellungenPage() {
  const params = useParams();
  const router = useRouter();
  const kursId = params.id as string;

  const [kurs, setKurs] = useState<Kurs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [todoistConnected, setTodoistConnected] = useState(false);
  const [todoistLoading, setTodoistLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/todoist/status").then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTodoistConnected(d.connected); })
      .finally(() => setTodoistLoading(false));
  }, []);

  async function syncTodoist() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/todoist/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kurs_id: kursId }),
      });
      const data = await res.json();
      if (res.ok) setSyncResult(`${data.synced} Aufgaben synchronisiert`);
      else setSyncResult(data.error || "Fehler");
    } finally { setSyncing(false); }
  }

  async function disconnectTodoist() {
    await fetch("/api/todoist/status", { method: "DELETE" });
    setTodoistConnected(false);
  }

  useEffect(() => {
    fetch(`/api/kurse/${kursId}`)
      .then(r => r.json())
      .then(d => setKurs({ ...d, start_datum: (d.start_datum || "").slice(0, 10), end_datum: (d.end_datum || "").slice(0, 10) }))
      .finally(() => setLoading(false));
  }, [kursId]);

  async function handleSave() {
    if (!kurs) return;
    setSaving(true);
    try {
      await fetch(`/api/kurse/${kursId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...kurs,
          start_datum: kurs.start_datum || null,
          end_datum: kurs.end_datum || null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000); window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await fetch(`/api/kurse/${kursId}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  const anmeldeLink = typeof window !== "undefined"
    ? `${window.location.origin}/anmeldung/${kursId}`
    : "";

  if (loading || !kurs) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-dpsg-blue" />
          <h2 className="text-lg font-bold text-dpsg-gray-900">Kurs-Einstellungen</h2>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-dpsg-blue px-4 py-2 text-sm font-bold text-white hover:bg-dpsg-blue-light transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Speichert..." : saved ? "Gespeichert!" : "Speichern"}
        </button>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-6">
        <div className="space-y-5">
          {/* Basisdaten */}
          <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm">
            <div className="border-b border-dpsg-gray-100 bg-dpsg-gray-50 px-5 py-3 rounded-t-xl">
              <span className="text-sm font-bold text-dpsg-gray-900">Basisdaten</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Kursname *</label>
                <input value={kurs.name} onChange={e => setKurs({ ...kurs, name: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Beschreibung</label>
                <textarea value={kurs.beschreibung || ""} onChange={e => setKurs({ ...kurs, beschreibung: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                  rows={4} placeholder="Kursbeschreibung für Ausschreibung und TN-Portal..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Start</label>
                  <input type="date" value={kurs.start_datum || ""} onChange={e => setKurs({ ...kurs, start_datum: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Ende</label>
                  <input type="date" value={kurs.end_datum || ""} onChange={e => setKurs({ ...kurs, end_datum: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Ort</label>
                  <input value={kurs.ort || ""} onChange={e => setKurs({ ...kurs, ort: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Max. Teilnehmende</label>
                  <input type="number" value={kurs.max_teilnehmende || ""} onChange={e => setKurs({ ...kurs, max_teilnehmende: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" min={1} />
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-red-200 bg-white shadow-sm">
            <div className="border-b border-red-100 bg-red-50 px-5 py-3 rounded-t-xl">
              <span className="text-sm font-bold text-red-800">Gefahrenzone</span>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-dpsg-gray-900">Kurs löschen</div>
                  <div className="text-xs text-dpsg-gray-500">Alle Daten, Anmeldungen und Dateien werden unwiderruflich gelöscht.</div>
                </div>
                {confirmDelete ? (
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(false)}
                      className="rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700">Abbrechen</button>
                    <button onClick={handleDelete}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white">Wirklich löschen</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    <Trash2 className="h-3.5 w-3.5" /> Löschen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Anmeldelink */}
          <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400 mb-2">Anmeldelink</div>
            {kurs.status === "ausgeschrieben" || kurs.status === "laufend" ? (
              <>
                <div className="rounded-lg bg-dpsg-gray-50 p-3 text-xs font-mono text-dpsg-gray-700 break-all mb-2">
                  {anmeldeLink}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(anmeldeLink)}
                    className="flex items-center gap-1 rounded-lg bg-dpsg-blue px-3 py-1.5 text-xs font-bold text-white">
                    <Copy className="h-3 w-3" /> Kopieren
                  </button>
                  <a href={anmeldeLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-dpsg-gray-100 px-3 py-1.5 text-xs font-bold text-dpsg-gray-700">
                    <ExternalLink className="h-3 w-3" /> Öffnen
                  </a>
                </div>
              </>
            ) : (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                Kurs muss erst ausgeschrieben werden um den Anmeldelink zu aktivieren.
              </div>
            )}
          </div>

          {/* Todoist */}
          <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400 mb-2">Todoist</div>
            {todoistLoading ? (
              <div className="text-xs text-dpsg-gray-400">Laden...</div>
            ) : todoistConnected ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-green-700 font-semibold">Verbunden</span>
                </div>
                <button onClick={syncTodoist} disabled={syncing}
                  className="w-full rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  {syncing ? "Synchronisiert..." : "Aufgaben syncen"}
                </button>
                {syncResult && <div className="text-xs text-dpsg-gray-600">{syncResult}</div>}
                <button onClick={disconnectTodoist}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-xs text-dpsg-gray-500 hover:text-red-600 hover:border-red-200">
                  Trennen
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-dpsg-gray-500">Verbinde deinen Todoist-Account um Aufgaben zu synchronisieren.</p>
                <a href="/api/todoist"
                  className="block w-full rounded-lg bg-dpsg-red px-3 py-2 text-xs font-bold text-white text-center hover:bg-dpsg-red-light">
                  Mit Todoist verbinden
                </a>
              </div>
            )}
          </div>

          {/* Status Info */}
          <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400 mb-2">Status</div>
            <div className="text-sm font-bold text-dpsg-gray-900 capitalize">{kurs.status}</div>
            <p className="text-xs text-dpsg-gray-500 mt-1">
              Status kann im Kurs-Header oben geändert werden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
