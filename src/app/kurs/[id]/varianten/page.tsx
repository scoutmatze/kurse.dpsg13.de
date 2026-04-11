"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Layers, Plus, Trash2, Check, X, Copy, Loader2,
  Star, Building2, Users, Moon, Euro, TrendingUp,
  ChevronDown, ChevronRight, AlertTriangle, Pencil
} from "lucide-react";

interface Variante {
  id: number;
  kurs_id: number;
  name: string;
  beschreibung?: string;
  ist_aktiv: boolean;
  tn_anzahl: number;
  teamende_anzahl: number;
  naechte: number;
  team_vorlauf: number;
  haus_id?: string;
  verpflegung: string;
  ue_pro_nacht: number;
  vp_pro_tag: number;
  farbe: string;
}

interface Haus {
  id: number;
  name: string;
  region: string;
  uebernachtung: number;
  vollpension: number;
  halbpension: number;
  selbstversorger: number;
}

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function VariantenPage() {
  const params = useParams();
  const kursId = params.id as string;

  const [varianten, setVarianten] = useState<Variante[]>([]);
  const [haeuser, setHaeuser] = useState<Haus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [cloneFrom, setCloneFrom] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [kursId]);

  async function load() {
    setLoading(true);
    try {
      const [vRes, hRes] = await Promise.all([
        fetch(`/api/varianten?kursId=${kursId}`).then(r => r.json()),
        fetch("/api/haeuser").then(r => r.json()),
      ]);
      setVarianten(vRes);
      setHaeuser(hRes);
    } finally {
      setLoading(false);
    }
  }

  async function createVariante() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/varianten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kurs_id: kursId,
          name: newName,
          clone_from: cloneFrom,
        }),
      });
      await load();
      setShowCreate(false);
      setNewName("");
      setCloneFrom(null);
    } finally {
      setSaving(false);
    }
  }

  async function updateVariante(id: number, updates: Partial<Variante>) {
    await fetch(`/api/varianten/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await load();
  }

  async function deleteVariante(id: number) {
    if (!confirm("Variante wirklich löschen?")) return;
    await fetch(`/api/varianten/${id}`, { method: "DELETE" });
    await load();
  }

  async function setActive(id: number) {
    await updateVariante(id, { ist_aktiv: true });
  }

  function calcKosten(v: Variante) {
    const gesamtPersonen = v.tn_anzahl + v.teamende_anzahl;
    const tnNaechte = v.tn_anzahl * v.naechte;
    const teamNaechte = v.teamende_anzahl * (v.naechte + v.team_vorlauf);
    const gesamtNaechte = tnNaechte + teamNaechte;
    const tage = v.naechte + 1;
    const teamTage = v.naechte + v.team_vorlauf + 1;

    const ue = Number(v.ue_pro_nacht) || 0;
    const vp = Number(v.vp_pro_tag) || 0;

    const kostenUe = gesamtNaechte * ue;
    const kostenVp = (v.tn_anzahl * tage + v.teamende_anzahl * teamTage) * vp;
    const gesamt = kostenUe + kostenVp;
    const proKopf = v.tn_anzahl > 0 ? gesamt / v.tn_anzahl : 0;

    return { gesamtPersonen, gesamtNaechte, kostenUe, kostenVp, gesamt, proKopf };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Layers className="h-5 w-5 text-dpsg-blue" />
          <h2 className="text-lg font-bold text-dpsg-gray-900">Varianten & Szenarien</h2>
          <span className="text-xs text-dpsg-gray-400">{varianten.length} Variante{varianten.length !== 1 ? "n" : ""}</span>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors">
          <Plus className="h-3.5 w-3.5" /> Neue Variante
        </button>
      </div>

      {varianten.length === 0 ? (
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-12 text-center">
          <Layers className="h-12 w-12 text-dpsg-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-dpsg-gray-700 mb-2">Noch keine Varianten</h3>
          <p className="text-sm text-dpsg-gray-500 mb-6">
            Erstelle verschiedene Szenarien um Kosten und Ablauf zu vergleichen.
            <br />z.B. "Burg Schwaneck, 25 TN" vs. "Josefstal, 30 TN"
          </p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-dpsg-red px-5 py-2.5 text-sm font-bold text-white hover:bg-dpsg-red-light transition-colors">
            <Plus className="h-4 w-4" /> Erste Variante anlegen
          </button>
        </div>
      ) : (
        <>
          {/* Comparison Grid */}
          <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${Math.min(varianten.length, 3)}, 1fr)` }}>
            {varianten.map(v => {
              const k = calcKosten(v);
              const haus = haeuser.find(h => String(h.id) === v.haus_id);
              const isEditing = editId === v.id;

              return (
                <div key={v.id} className={`rounded-xl border-2 bg-white shadow-sm transition-all ${
                  v.ist_aktiv ? "border-green-400 shadow-green-100" : "border-dpsg-gray-200"
                }`}>
                  {/* Card Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-dpsg-gray-100" style={{ borderTopColor: v.farbe, borderTopWidth: 3 }}>
                    <div className="flex items-center gap-2">
                      {v.ist_aktiv && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold border border-green-200">
                          <Check className="h-3 w-3" /> Aktiv
                        </span>
                      )}
                      <span className="text-sm font-bold text-dpsg-gray-900">{v.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {!v.ist_aktiv && (
                        <button onClick={() => setActive(v.id)} title="Als aktiv setzen"
                          className="p-1 rounded text-dpsg-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => { setCloneFrom(v.id); setNewName(v.name + " (Kopie)"); setShowCreate(true); }} title="Klonen"
                        className="p-1 rounded text-dpsg-gray-400 hover:text-dpsg-blue hover:bg-dpsg-blue/10 transition-colors">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEditId(isEditing ? null : v.id)} title="Bearbeiten"
                        className="p-1 rounded text-dpsg-gray-400 hover:text-dpsg-blue hover:bg-dpsg-blue/10 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteVariante(v.id)} title="Löschen"
                        className="p-1 rounded text-dpsg-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Edit Mode */}
                  {isEditing && (
                    <div className="px-5 py-4 bg-dpsg-gray-50 border-b border-dpsg-gray-100 space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Name</label>
                        <input value={v.name} onChange={e => setVarianten(varianten.map(x => x.id === v.id ? { ...x, name: e.target.value } : x))}
                          className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-1.5 text-sm focus:border-dpsg-blue focus:outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">TN</label>
                          <input type="number" value={v.tn_anzahl} min={1}
                            onChange={e => setVarianten(varianten.map(x => x.id === v.id ? { ...x, tn_anzahl: Number(e.target.value) || 1 } : x))}
                            className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-1.5 text-sm focus:border-dpsg-blue focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Team</label>
                          <input type="number" value={v.teamende_anzahl} min={1}
                            onChange={e => setVarianten(varianten.map(x => x.id === v.id ? { ...x, teamende_anzahl: Number(e.target.value) || 1 } : x))}
                            className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-1.5 text-sm focus:border-dpsg-blue focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Nächte</label>
                          <input type="number" value={v.naechte} min={1}
                            onChange={e => setVarianten(varianten.map(x => x.id === v.id ? { ...x, naechte: Number(e.target.value) || 1 } : x))}
                            className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-1.5 text-sm focus:border-dpsg-blue focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Vorlauf</label>
                          <input type="number" value={v.team_vorlauf} min={0}
                            onChange={e => setVarianten(varianten.map(x => x.id === v.id ? { ...x, team_vorlauf: Number(e.target.value) || 0 } : x))}
                            className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-1.5 text-sm focus:border-dpsg-blue focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">ÜN/Nacht</label>
                          <input type="number" value={v.ue_pro_nacht} min={0}
                            onChange={e => setVarianten(varianten.map(x => x.id === v.id ? { ...x, ue_pro_nacht: Number(e.target.value) || 0 } : x))}
                            className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-1.5 text-sm focus:border-dpsg-blue focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">VP/Tag</label>
                          <input type="number" value={v.vp_pro_tag} min={0}
                            onChange={e => setVarianten(varianten.map(x => x.id === v.id ? { ...x, vp_pro_tag: Number(e.target.value) || 0 } : x))}
                            className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-1.5 text-sm focus:border-dpsg-blue focus:outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Haus</label>
                        <select value={v.haus_id || ""}
                          onChange={e => {
                            const hId = e.target.value;
                            const h = haeuser.find(x => String(x.id) === hId);
                            setVarianten(varianten.map(x => x.id === v.id ? {
                              ...x, haus_id: hId,
                              ue_pro_nacht: h ? h.uebernachtung : x.ue_pro_nacht,
                              vp_pro_tag: h ? h.vollpension : x.vp_pro_tag,
                            } : x));
                          }}
                          className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-1.5 text-sm focus:border-dpsg-blue focus:outline-none">
                          <option value="">Manuell</option>
                          {haeuser.map(h => (
                            <option key={h.id} value={String(h.id)}>{h.name} ({h.region})</option>
                          ))}
                        </select>
                      </div>
                      <button onClick={() => { updateVariante(v.id, v); setEditId(null); }}
                        className="w-full rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors">
                        Speichern
                      </button>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="px-5 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-dpsg-gray-400" />
                        <div>
                          <div className="text-xs text-dpsg-gray-400">Teilnehmende</div>
                          <div className="text-sm font-bold">{v.tn_anzahl} + {v.teamende_anzahl} Team</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Moon className="h-3.5 w-3.5 text-dpsg-gray-400" />
                        <div>
                          <div className="text-xs text-dpsg-gray-400">Nächte</div>
                          <div className="text-sm font-bold">{v.naechte} (+{v.team_vorlauf} Vorlauf)</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-dpsg-gray-400" />
                      <div>
                        <div className="text-xs text-dpsg-gray-400">Unterkunft</div>
                        <div className="text-sm font-bold">{haus?.name || "Manuell"}</div>
                        <div className="text-[10px] text-dpsg-gray-400">
                          ÜN {fmt(Number(v.ue_pro_nacht))}EUR &middot; VP {fmt(Number(v.vp_pro_tag))}EUR
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-dpsg-gray-100" />

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-dpsg-gray-500">Unterkunft</span>
                        <span className="font-bold">{fmt(k.kostenUe)} EUR</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-dpsg-gray-500">Verpflegung</span>
                        <span className="font-bold">{fmt(k.kostenVp)} EUR</span>
                      </div>
                      <div className="h-px bg-dpsg-gray-100" />
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-dpsg-gray-900">Grundkosten</span>
                        <span className="font-bold" style={{ color: v.farbe }}>{fmt(k.gesamt)} EUR</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-dpsg-gray-500">Pro Kopf (nur ÜN+VP)</span>
                        <span className="font-bold text-dpsg-gray-700">{fmt(k.proKopf)} EUR</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Comparison Bar */}
          {varianten.length >= 2 && (
            <div className="mt-6 rounded-xl border border-dpsg-gray-200 bg-white shadow-sm">
              <div className="border-b border-dpsg-gray-100 bg-dpsg-gray-50 px-5 py-3 rounded-t-xl flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-dpsg-blue" />
                <span className="text-sm font-bold">Schnellvergleich</span>
              </div>
              <div className="p-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400 pb-3 pr-4">Kriterium</th>
                      {varianten.map(v => (
                        <th key={v.id} className="text-right text-xs font-bold pb-3 px-3" style={{ color: v.farbe }}>
                          {v.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dpsg-gray-50">
                    {[
                      { label: "Teilnehmende", fn: (v: Variante) => `${v.tn_anzahl}` },
                      { label: "Team", fn: (v: Variante) => `${v.teamende_anzahl}` },
                      { label: "Nächte", fn: (v: Variante) => `${v.naechte}` },
                      { label: "Übernachtungen", fn: (v: Variante) => `${calcKosten(v).gesamtNaechte}` },
                      { label: "Kosten ÜN", fn: (v: Variante) => `${fmt(calcKosten(v).kostenUe)} EUR` },
                      { label: "Kosten VP", fn: (v: Variante) => `${fmt(calcKosten(v).kostenVp)} EUR` },
                      { label: "Grundkosten gesamt", fn: (v: Variante) => `${fmt(calcKosten(v).gesamt)} EUR`, bold: true },
                      { label: "Pro Kopf", fn: (v: Variante) => `${fmt(calcKosten(v).proKopf)} EUR`, bold: true },
                    ].map(row => (
                      <tr key={row.label}>
                        <td className="py-2 pr-4 text-xs text-dpsg-gray-600">{row.label}</td>
                        {varianten.map(v => {
                          const val = row.fn(v);
                          const allVals = varianten.map(x => parseFloat(row.fn(x).replace(/[^0-9,.]/g, "").replace(",", ".")));
                          const numVal = parseFloat(val.replace(/[^0-9,.]/g, "").replace(",", "."));
                          const isMin = allVals.length > 1 && numVal === Math.min(...allVals) && row.bold;
                          return (
                            <td key={v.id} className={`py-2 px-3 text-right text-xs ${
                              row.bold ? "font-bold text-dpsg-gray-900" : "text-dpsg-gray-700"
                            } ${isMin ? "text-green-700" : ""}`}>
                              {val}
                              {isMin && <span className="ml-1 text-[10px]">&#10003;</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl bg-white shadow-lg w-full max-w-sm">
            <div className="flex items-center justify-between border-b border-dpsg-gray-100 px-5 py-4">
              <h3 className="text-base font-bold text-dpsg-gray-900">
                {cloneFrom ? "Variante klonen" : "Neue Variante"}
              </h3>
              <button onClick={() => { setShowCreate(false); setCloneFrom(null); setNewName(""); }}
                className="text-dpsg-gray-400 hover:text-dpsg-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Name *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                  placeholder="z.B. Burg Schwaneck, 25 TN" autoFocus />
              </div>
              {cloneFrom && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                  Kalkulation und Programm werden von der Quell-Variante übernommen.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-dpsg-gray-100 px-5 py-4">
              <button onClick={() => { setShowCreate(false); setCloneFrom(null); setNewName(""); }}
                className="rounded-lg bg-dpsg-gray-100 px-4 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
                Abbrechen
              </button>
              <button onClick={createVariante} disabled={!newName.trim() || saving}
                className="rounded-lg bg-dpsg-blue px-4 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors disabled:opacity-50">
                {saving ? "Wird erstellt..." : cloneFrom ? "Klonen" : "Anlegen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
