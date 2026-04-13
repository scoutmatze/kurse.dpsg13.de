"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Package, Plus, Trash2, X, Loader2, Check, Wand2 } from "lucide-react";

interface PackItem {
  id: number; titel: string; kategorie: string; pflicht: boolean;
}

export default function PacklistePage() {
  const params = useParams();
  const kursId = params.id as string;
  const [items, setItems] = useState<PackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitel, setNewTitel] = useState("");
  const [newKat, setNewKat] = useState("Allgemein");

  useEffect(() => { load(); }, [kursId]);

  async function load() {
    try {
      const res = await fetch(`/api/packliste/${kursId}`);
      if (res.ok) setItems(await res.json());
    } finally { setLoading(false); }
  }

  async function addItem() {
    if (!newTitel.trim()) return;
    await fetch(`/api/packliste/${kursId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", titel: newTitel, kategorie: newKat }),
    });
    setNewTitel("");
    await load();
  }

  async function deleteItem(id: number) {
    await fetch(`/api/packliste/${kursId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", item_id: id }),
    });
    await load();
  }

  async function initDefault() {
    await fetch(`/api/packliste/${kursId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "init_default" }),
    });
    await load();
  }

  const kategorien = [...new Set(items.map(i => i.kategorie))].sort();

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-dpsg-blue" />
          <h2 className="text-lg font-bold text-dpsg-gray-900">Packliste</h2>
          <span className="text-xs text-dpsg-gray-400">{items.length} Einträge</span>
        </div>
        <div className="flex gap-2">
          {items.length === 0 && (
            <button onClick={initDefault} className="flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200">
              <Wand2 className="h-3.5 w-3.5" /> Standard-Packliste
            </button>
          )}
        </div>
      </div>

      {/* Add */}
      <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-4 mb-4 flex gap-3">
        <input value={newTitel} onChange={e => setNewTitel(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addItem(); }}
          className="flex-1 rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none"
          placeholder="Neuer Eintrag..." />
        <select value={newKat} onChange={e => setNewKat(e.target.value)}
          className="rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm">
          {["Kleidung", "Schlafen", "Hygiene", "Für den Kurs", "Dokumente", "Optional", "Allgemein"].map(k => <option key={k}>{k}</option>)}
        </select>
        <button onClick={addItem} disabled={!newTitel.trim()}
          className="rounded-lg bg-dpsg-blue px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* List by category */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-12 text-center">
          <Package className="h-12 w-12 text-dpsg-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-dpsg-gray-700 mb-2">Noch keine Packliste</h3>
          <p className="text-sm text-dpsg-gray-500 mb-4">Erstelle eine Packliste oder lade die Standard-Vorlage.</p>
          <button onClick={initDefault}
            className="rounded-lg bg-dpsg-red px-5 py-2.5 text-sm font-bold text-white hover:bg-dpsg-red-light">
            <Wand2 className="inline h-4 w-4 mr-1" /> Standard-Packliste laden
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {kategorien.map(kat => (
            <div key={kat} className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-dpsg-gray-50 px-5 py-3 border-b border-dpsg-gray-100">
                <span className="text-sm font-bold text-dpsg-gray-900">{kat}</span>
                <span className="text-xs text-dpsg-gray-400 ml-2">({items.filter(i => i.kategorie === kat).length})</span>
              </div>
              <div className="divide-y divide-dpsg-gray-50">
                {items.filter(i => i.kategorie === kat).map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-2.5 group hover:bg-dpsg-gray-50">
                    <Check className={`h-4 w-4 flex-shrink-0 ${item.pflicht ? "text-dpsg-blue" : "text-dpsg-gray-300"}`} />
                    <span className="text-sm text-dpsg-gray-900 flex-1">{item.titel}</span>
                    {item.pflicht && <span className="text-[10px] font-bold text-dpsg-blue">Pflicht</span>}
                    <button onClick={() => deleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-dpsg-gray-300 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-dpsg-gray-400 text-center mt-6">Die Packliste wird im Teilnehmer*innen-Portal angezeigt.</p>
    </div>
  );
}
