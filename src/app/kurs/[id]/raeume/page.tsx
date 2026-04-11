"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Building2, Plus, Trash2, X, Loader2, AlertTriangle,
  Check, Users, Clock, Pencil, ChevronDown, ChevronRight
} from "lucide-react";

interface Raum {
  id: number;
  name: string;
  kapazitaet?: number;
  ausstattung?: string;
  stockwerk?: string;
}

interface Konflikt {
  block1_id: number;
  block1_titel: string;
  block1_start: string;
  block1_end: string;
  block2_id: number;
  block2_titel: string;
  block2_start: string;
  block2_end: string;
  raum: string;
  tag_nummer: number;
}

interface ProgrammBlock {
  tag_nummer: number;
  tag_titel: string;
  start_zeit: string;
  end_zeit: string;
  titel: string;
  typ: string;
  raum?: string;
  id: number;
}

const BLOCK_COLORS: Record<string, string> = {
  programm: "#003056", workshop: "#7c3aed", plenum: "#0891b2",
  pause: "#9e9a92", essen: "#b45309", freizeit: "#15803d", orga: "#8b0a1e",
};

const STUNDEN = Array.from({ length: 16 }, (_, i) => i + 7); // 7-22

export default function RaeumePage() {
  const params = useParams();
  const kursId = params.id as string;

  const [raeume, setRaeume] = useState<Raum[]>([]);
  const [konflikte, setKonflikte] = useState<Konflikt[]>([]);
  const [programm, setProgramm] = useState<ProgrammBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newRaum, setNewRaum] = useState({ name: "", kapazitaet: 30, ausstattung: "", stockwerk: "" });
  const [activeTag, setActiveTag] = useState(1);

  useEffect(() => { load(); }, [kursId]);

  async function load() {
    setLoading(true);
    try {
      const [rRes, kRes, pRes] = await Promise.all([
        fetch(`/api/raeume?kursId=${kursId}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/raeume/konflikte?kursId=${kursId}`).then(r => r.ok ? r.json() : { konflikte: [] }),
        fetch(`/api/programm/${kursId}`).then(r => r.ok ? r.json() : []),
      ]);
      setRaeume(rRes);
      setKonflikte(kRes.konflikte || []);

      // Flatten programm
      const flat: ProgrammBlock[] = [];
      for (const tag of pRes) {
        for (const block of tag.blocks || []) {
          flat.push({ ...block, tag_nummer: tag.tag_nummer, tag_titel: tag.tag_titel });
        }
      }
      setProgramm(flat);
    } finally {
      setLoading(false);
    }
  }

  async function addRaum() {
    if (!newRaum.name.trim()) return;
    await fetch("/api/raeume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRaum),
    });
    await load();
    setShowAdd(false);
    setNewRaum({ name: "", kapazitaet: 30, ausstattung: "", stockwerk: "" });
  }

  // Get unique rooms from both raeume table AND programm blocks
  const alleRaeume = useMemo(() => {
    const fromDb = raeume.map(r => r.name);
    const fromProgramm = [...new Set(programm.filter(b => b.raum).map(b => b.raum!))];
    return [...new Set([...fromDb, ...fromProgramm])].sort();
  }, [raeume, programm]);

  const tage = useMemo(() => {
    return [...new Set(programm.map(b => b.tag_nummer))].sort();
  }, [programm]);

  const tagBlocks = useMemo(() => {
    return programm.filter(b => b.tag_nummer === activeTag && b.raum);
  }, [programm, activeTag]);

  const tagKonflikte = useMemo(() => {
    return konflikte.filter(k => k.tag_nummer === activeTag);
  }, [konflikte, activeTag]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-dpsg-blue" />
          <h2 className="text-lg font-bold text-dpsg-gray-900">Raumplanung</h2>
          {konflikte.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">
              <AlertTriangle className="h-3 w-3" /> {konflikte.length} Konflikt{konflikte.length !== 1 ? "e" : ""}
            </span>
          )}
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors">
          <Plus className="h-3.5 w-3.5" /> Raum anlegen
        </button>
      </div>

      {/* Konflikte anzeigen */}
      {konflikte.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 mb-4 overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-bold text-red-800">Raumkonflikte</span>
          </div>
          <div className="divide-y divide-red-100">
            {konflikte.map((k, i) => (
              <div key={i} className="px-4 py-2 text-xs text-red-700">
                <strong>Tag {k.tag_nummer}, {k.raum}:</strong>{" "}
                "{k.block1_titel}" ({k.block1_start}–{k.block1_end}) kollidiert mit "{k.block2_titel}" ({k.block2_start}–{k.block2_end})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raumliste */}
      {raeume.length > 0 && (
        <div className="flex gap-3 mb-4 overflow-x-auto pb-1">
          {raeume.map(r => (
            <div key={r.id} className="flex-shrink-0 rounded-lg border border-dpsg-gray-200 bg-white px-4 py-2">
              <div className="text-xs font-bold text-dpsg-gray-900">{r.name}</div>
              <div className="text-[10px] text-dpsg-gray-400">
                {r.kapazitaet && <><Users className="inline h-3 w-3 mr-0.5" />{r.kapazitaet} Plätze</>}
                {r.ausstattung && <> · {r.ausstattung}</>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tag-Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {tage.map(t => (
          <button key={t} onClick={() => setActiveTag(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTag === t ? "bg-dpsg-blue text-white" : "bg-white border border-dpsg-gray-200 text-dpsg-gray-600"
            }`}>
            Tag {t}
            {konflikte.filter(k => k.tag_nummer === t).length > 0 && (
              <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>
        ))}
      </div>

      {/* Visual Room Grid */}
      {alleRaeume.length > 0 && tage.length > 0 ? (
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 700 }}>
              {/* Time header */}
              <div className="flex border-b border-dpsg-gray-100 bg-dpsg-gray-50">
                <div className="w-32 flex-shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">Raum</div>
                <div className="flex-1 flex">
                  {STUNDEN.map(h => (
                    <div key={h} className="flex-1 text-center text-[10px] text-dpsg-gray-400 py-2 border-l border-dpsg-gray-100">
                      {h}:00
                    </div>
                  ))}
                </div>
              </div>

              {/* Room rows */}
              {alleRaeume.map(raum => {
                const blocks = tagBlocks.filter(b => b.raum === raum);
                const hasKonflikt = tagKonflikte.some(k => k.raum === raum);

                return (
                  <div key={raum} className={`flex border-b border-dpsg-gray-50 ${hasKonflikt ? "bg-red-50/50" : "hover:bg-dpsg-gray-50"}`}>
                    <div className="w-32 flex-shrink-0 px-3 py-3 flex items-center gap-2">
                      {hasKonflikt && <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />}
                      <span className="text-xs font-semibold text-dpsg-gray-800 truncate">{raum}</span>
                    </div>
                    <div className="flex-1 relative" style={{ height: 40 }}>
                      {/* Grid lines */}
                      {STUNDEN.map(h => (
                        <div key={h} className="absolute top-0 bottom-0 border-l border-dpsg-gray-100" style={{ left: `${((h - 7) / 15) * 100}%` }} />
                      ))}

                      {/* Blocks */}
                      {blocks.map(block => {
                        const [sh, sm] = block.start_zeit.split(":").map(Number);
                        const [eh, em] = block.end_zeit.split(":").map(Number);
                        const startMin = sh * 60 + sm - 420; // offset from 7:00
                        const endMin = eh * 60 + em - 420;
                        const totalMin = 15 * 60; // 7:00 - 22:00
                        const left = (startMin / totalMin) * 100;
                        const width = ((endMin - startMin) / totalMin) * 100;
                        const color = BLOCK_COLORS[block.typ] || "#9e9a92";

                        const isConflict = tagKonflikte.some(k =>
                          k.raum === raum && (k.block1_id === block.id || k.block2_id === block.id)
                        );

                        return (
                          <div key={block.id} className="absolute top-1 bottom-1 rounded overflow-hidden" title={`${block.titel} (${block.start_zeit}–${block.end_zeit})`}
                            style={{
                              left: `${left}%`, width: `${Math.max(width, 2)}%`,
                              background: color + "20",
                              borderLeft: `2px solid ${color}`,
                              border: isConflict ? "2px solid #dc2626" : undefined,
                            }}>
                            <div className="px-1 text-[9px] font-semibold truncate" style={{ color }}>{block.titel}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-12 text-center">
          <Building2 className="h-12 w-12 text-dpsg-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-dpsg-gray-700 mb-2">Keine Räume zugewiesen</h3>
          <p className="text-sm text-dpsg-gray-500">Weise im Tagesplan Räume zu, um die Raumplanung zu nutzen. Oder lege hier Räume an.</p>
        </div>
      )}

      {/* Add Room Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl bg-white shadow-lg w-full max-w-sm">
            <div className="flex items-center justify-between border-b border-dpsg-gray-100 px-5 py-4">
              <h3 className="text-base font-bold text-dpsg-gray-900">Neuer Raum</h3>
              <button onClick={() => setShowAdd(false)} className="text-dpsg-gray-400 hover:text-dpsg-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Name *</label>
                <input value={newRaum.name} onChange={e => setNewRaum({ ...newRaum, name: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                  placeholder="z.B. Seminarraum 1" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Kapazität</label>
                  <input type="number" value={newRaum.kapazitaet} onChange={e => setNewRaum({ ...newRaum, kapazitaet: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" min={0} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Stockwerk</label>
                  <input value={newRaum.stockwerk} onChange={e => setNewRaum({ ...newRaum, stockwerk: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none"
                    placeholder="z.B. EG" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Ausstattung</label>
                <input value={newRaum.ausstattung} onChange={e => setNewRaum({ ...newRaum, ausstattung: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none"
                  placeholder="Beamer, Flipchart, Tische..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-dpsg-gray-100 px-5 py-4">
              <button onClick={() => setShowAdd(false)} className="rounded-lg bg-dpsg-gray-100 px-4 py-2 text-xs font-bold text-dpsg-gray-700">Abbrechen</button>
              <button onClick={addRaum} disabled={!newRaum.name.trim()}
                className="rounded-lg bg-dpsg-blue px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Anlegen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
