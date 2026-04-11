"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Plus, Trash2, Pencil, X, Loader2, Check,
  ExternalLink, Users, ArrowLeft
} from "lucide-react";

interface Haus {
  id: number;
  name: string;
  region: string;
  adresse?: string;
  url?: string;
  uebernachtung: number;
  vollpension: number;
  halbpension: number;
  selbstversorger: number;
  max_personen?: number;
  notizen?: string;
}

function fmt(n: number) {
  return Number(n).toFixed(2).replace(".", ",");
}

export default function HaeuserPage() {
  const [haeuser, setHaeuser] = useState<Haus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [newHaus, setNewHaus] = useState({ name: "", region: "", adresse: "", url: "", uebernachtung: 0, vollpension: 0, halbpension: 0, selbstversorger: 0, max_personen: 0, notizen: "" });
  const router = useRouter();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/haeuser");
      if (res.ok) setHaeuser(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function addHaus() {
    if (!newHaus.name.trim()) return;
    await fetch("/api/haeuser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newHaus),
    });
    await load();
    setShowAdd(false);
    setNewHaus({ name: "", region: "", adresse: "", url: "", uebernachtung: 0, vollpension: 0, halbpension: 0, selbstversorger: 0, max_personen: 0, notizen: "" });
  }

  if (loading) {
    return <div className="min-h-screen bg-dpsg-beige-50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-dpsg-beige-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.push("/dashboard")} className="text-dpsg-gray-400 hover:text-dpsg-blue"><ArrowLeft className="h-4 w-4" /></button>
          <Building2 className="h-5 w-5 text-dpsg-blue" />
          <h1 className="text-2xl font-bold text-dpsg-gray-900">Häuser-Datenbank</h1>
          <span className="text-xs text-dpsg-gray-400">{haeuser.length} Häuser</span>
        </div>
        <p className="text-sm text-dpsg-gray-500 mb-6 ml-11">Übernachtungshäuser mit Preisen für die Kalkulation.</p>

        <div className="flex justify-end mb-4">
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors">
            <Plus className="h-3.5 w-3.5" /> Haus hinzufügen
          </button>
        </div>

        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dpsg-gray-100 bg-dpsg-gray-50">
                  {["Name", "Region", "ÜN", "VP", "HP", "SV", "Plätze", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dpsg-gray-50">
                {haeuser.map(h => (
                  <tr key={h.id} className="hover:bg-dpsg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-dpsg-gray-900">{h.name}</div>
                      {h.url && (
                        <a href={h.url} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-dpsg-blue hover:underline flex items-center gap-0.5">
                          Website <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-dpsg-gray-600">{h.region || "\u2014"}</td>
                    <td className="px-4 py-3 text-dpsg-gray-700 font-semibold">{Number(h.uebernachtung) > 0 ? fmt(h.uebernachtung) + " \u20ac" : "\u2014"}</td>
                    <td className="px-4 py-3 text-dpsg-gray-700">{Number(h.vollpension) > 0 ? fmt(h.vollpension) + " \u20ac" : "\u2014"}</td>
                    <td className="px-4 py-3 text-dpsg-gray-700">{Number(h.halbpension) > 0 ? fmt(h.halbpension) + " \u20ac" : "\u2014"}</td>
                    <td className="px-4 py-3 text-dpsg-gray-700">{Number(h.selbstversorger) > 0 ? fmt(h.selbstversorger) + " \u20ac" : "\u2014"}</td>
                    <td className="px-4 py-3 text-dpsg-gray-600">{h.max_personen || "\u2014"}</td>
                    <td className="px-4 py-3">
                      {h.notizen && (
                        <span className="text-[10px] text-dpsg-gray-400" title={h.notizen}>ℹ️</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showAdd && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="rounded-xl bg-white shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-dpsg-gray-100 px-5 py-4">
                <h3 className="text-base font-bold text-dpsg-gray-900">Neues Haus</h3>
                <button onClick={() => setShowAdd(false)} className="text-dpsg-gray-400"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Name *</label>
                  <input value={newHaus.name} onChange={e => setNewHaus({ ...newHaus, name: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Region</label>
                    <input value={newHaus.region} onChange={e => setNewHaus({ ...newHaus, region: e.target.value })}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Max. Personen</label>
                    <input type="number" value={newHaus.max_personen} onChange={e => setNewHaus({ ...newHaus, max_personen: Number(e.target.value) })}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" min={0} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Website URL</label>
                  <input value={newHaus.url} onChange={e => setNewHaus({ ...newHaus, url: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" placeholder="https://..." />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: "uebernachtung", label: "ÜN/Nacht" },
                    { key: "vollpension", label: "VP/Tag" },
                    { key: "halbpension", label: "HP/Tag" },
                    { key: "selbstversorger", label: "SV/Tag" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">{f.label}</label>
                      <input type="number" value={(newHaus as any)[f.key]} onChange={e => setNewHaus({ ...newHaus, [f.key]: Number(e.target.value) })}
                        className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" min={0} step="0.5" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Notizen</label>
                  <textarea value={newHaus.notizen} onChange={e => setNewHaus({ ...newHaus, notizen: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" rows={2} />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-dpsg-gray-100 px-5 py-4">
                <button onClick={() => setShowAdd(false)} className="rounded-lg bg-dpsg-gray-100 px-4 py-2 text-xs font-bold text-dpsg-gray-700">Abbrechen</button>
                <button onClick={addHaus} disabled={!newHaus.name.trim()} className="rounded-lg bg-dpsg-blue px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Anlegen</button>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-center text-dpsg-gray-400 mt-8">Deutsche Pfadfinder*innenschaft Sankt Georg &middot; Gut Pfad!</p>
      </div>
    </div>
  );
}
