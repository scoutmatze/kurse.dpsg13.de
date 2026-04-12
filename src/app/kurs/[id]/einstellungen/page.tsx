"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Settings, Save, Loader2, Check, Trash2, AlertTriangle,
  Copy, ExternalLink
} from "lucide-react";

interface Kurs {
  id: number;
  name: string;
  beschreibung: string;
  start_datum: string;
  end_datum: string;
  ort: string;
  max_teilnehmende: number;
  team_vorlauf_tage: number;
  status: string;
}

export default function EinstellungenPage() {
  const params = useParams();
  const router = useRouter();
  const kursId = params.id as string;

  const [kurs, setKurs] = useState<Kurs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/kurse/${kursId}`)
      .then(r => r.json())
      .then(setKurs)
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
          name: kurs.name,
          beschreibung: kurs.beschreibung,
          start_datum: kurs.start_datum || null,
          end_datum: kurs.end_datum || null,
          ort: kurs.ort,
          max_teilnehmende: kurs.max_teilnehmende,
          team_vorlauf_tage: kurs.team_vorlauf_tage,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Kurs wirklich löschen? Alle Daten (Anmeldungen, Aufgaben, Programm) werden unwiderruflich gelöscht.")) return;
    if (!confirm("Bist du wirklich sicher?")) return;
    await fetch(`/api/kurse/${kursId}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  async function handleClone() {
    if (!kurs) return;
    const name = prompt("Name für den kopierten Kurs:", kurs.name + " (Kopie)");
    if (!name) return;
    const res = await fetch("/api/kurse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        beschreibung: kurs.beschreibung,
        ort: kurs.ort,
        max_teilnehmende: kurs.max_teilnehmende,
        team_vorlauf_tage: kurs.team_vorlauf_tage,
      }),
    });
    if (res.ok) {
      const newKurs = await res.json();
      router.push(`/kurs/${newKurs.id}/kalkulation`);
    }
  }

  const anmeldeLink = typeof window !== "undefined"
    ? `${window.location.origin}/anmeldung/${kursId}` : "";

  if (loading || !kurs) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-dpsg-blue" />
          <h2 className="text-lg font-bold text-dpsg-gray-900">Einstellungen</h2>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-dpsg-blue px-4 py-2 text-sm font-bold text-white hover:bg-dpsg-blue-light transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Speichert..." : saved ? "Gespeichert!" : "Speichern"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Basisdaten */}
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-dpsg-gray-900">Kursdaten</h3>
          <div>
            <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Kursname</label>
            <input value={kurs.name} onChange={e => setKurs({ ...kurs, name: e.target.value })}
              className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Beschreibung</label>
            <textarea value={kurs.beschreibung || ""} onChange={e => setKurs({ ...kurs, beschreibung: e.target.value })}
              className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
              rows={3} placeholder="Kursbeschreibung für die Ausschreibung..." />
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Ort</label>
              <input value={kurs.ort || ""} onChange={e => setKurs({ ...kurs, ort: e.target.value })}
                className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Max. Teilnehmende</label>
              <input type="number" value={kurs.max_teilnehmende || ""} onChange={e => setKurs({ ...kurs, max_teilnehmende: Number(e.target.value) })}
                className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" min={1} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Team-Vorlauf (Tage)</label>
              <input type="number" value={kurs.team_vorlauf_tage || 1} onChange={e => setKurs({ ...kurs, team_vorlauf_tage: Number(e.target.value) })}
                className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" min={0} />
            </div>
          </div>
        </div>

        {/* Anmeldelink */}
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-5">
          <h3 className="text-sm font-bold text-dpsg-gray-900 mb-3">Anmeldelink</h3>
          {kurs.status === "ausgeschrieben" || kurs.status === "laufend" ? (
            <div className="flex items-center gap-2">
              <input value={anmeldeLink} readOnly
                className="flex-1 rounded-lg border border-dpsg-gray-200 bg-dpsg-gray-50 px-3 py-2 text-sm text-dpsg-gray-600" />
              <button onClick={() => navigator.clipboard.writeText(anmeldeLink)}
                className="flex items-center gap-1.5 rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white">
                <Copy className="h-3.5 w-3.5" /> Kopieren
              </button>
              <a href={anmeldeLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700">
                <ExternalLink className="h-3.5 w-3.5" /> Öffnen
              </a>
            </div>
          ) : (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Kurs muss erst auf "Ausgeschrieben" gesetzt werden, bevor der Anmeldelink funktioniert.
            </div>
          )}
        </div>

        {/* Aktionen */}
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-5">
          <h3 className="text-sm font-bold text-dpsg-gray-900 mb-3">Aktionen</h3>
          <div className="flex gap-3">
            <button onClick={handleClone}
              className="flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-4 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
              <Copy className="h-3.5 w-3.5" /> Kurs als Vorlage klonen
            </button>
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Kurs löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
