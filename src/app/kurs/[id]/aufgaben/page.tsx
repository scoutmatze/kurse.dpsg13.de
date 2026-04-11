"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  ClipboardList, Plus, Trash2, X, Check, Loader2,
  ChevronDown, ChevronRight, Calendar, Flag, User,
  CircleDot, Circle, CheckCircle2, Clock, AlertTriangle
} from "lucide-react";

interface Aufgabe {
  id: number;
  kurs_id: number;
  parent_id: number | null;
  titel: string;
  beschreibung?: string;
  zugewiesen_an?: number;
  zugewiesen_name?: string;
  zugewiesen_an_name?: string;
  status: string;
  prioritaet: string;
  deadline?: string;
  phase: string;
}

const PHASEN = [
  { id: "vorbereitung", label: "Vorbereitung", color: "#003056" },
  { id: "waehrend", label: "Während des Kurses", color: "#0891b2" },
  { id: "nachbereitung", label: "Nachbereitung", color: "#7c3aed" },
];

const PRIO = [
  { id: "niedrig", label: "Niedrig", color: "#9e9a92", icon: Flag },
  { id: "mittel", label: "Mittel", color: "#b45309", icon: Flag },
  { id: "hoch", label: "Hoch", color: "#dc2626", icon: Flag },
  { id: "dringend", label: "Dringend", color: "#b91c1c", icon: AlertTriangle },
];

const STATUS_ICONS: Record<string, { icon: any; color: string; label: string }> = {
  offen: { icon: Circle, color: "#9e9a92", label: "Offen" },
  in_bearbeitung: { icon: CircleDot, color: "#003056", label: "In Bearbeitung" },
  erledigt: { icon: CheckCircle2, color: "#15803d", label: "Erledigt" },
};

export default function AufgabenPage() {
  const params = useParams();
  const kursId = params.id as string;

  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [newAufgabe, setNewAufgabe] = useState({
    titel: "", beschreibung: "", zugewiesen_name: "",
    prioritaet: "mittel", deadline: "", phase: "vorbereitung",
  });
  const [view, setView] = useState<"liste" | "gantt">("liste");
  const [expandedPhasen, setExpandedPhasen] = useState<Record<string, boolean>>(
    { vorbereitung: true, waehrend: true, nachbereitung: true }
  );

  useEffect(() => { load(); }, [kursId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/aufgaben/${kursId}`);
      if (res.ok) setAufgaben(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function createAufgabe() {
    if (!newAufgabe.titel.trim()) return;
    await fetch(`/api/aufgaben/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...newAufgabe }),
    });
    await load();
    setShowAdd(false);
    setNewAufgabe({ titel: "", beschreibung: "", zugewiesen_name: "", prioritaet: "mittel", deadline: "", phase: "vorbereitung" });
  }

  async function toggleStatus(a: Aufgabe) {
    const next = a.status === "offen" ? "in_bearbeitung" : a.status === "in_bearbeitung" ? "erledigt" : "offen";
    await fetch(`/api/aufgaben/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", aufgabe_id: a.id, status: next }),
    });
    await load();
  }

  async function deleteAufgabe(id: number) {
    await fetch(`/api/aufgaben/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", aufgabe_id: id }),
    });
    await load();
  }

  const grouped = useMemo(() => {
    const g: Record<string, Aufgabe[]> = {};
    for (const phase of PHASEN) {
      g[phase.id] = aufgaben.filter(a => a.phase === phase.id);
    }
    return g;
  }, [aufgaben]);

  const stats = {
    gesamt: aufgaben.length,
    offen: aufgaben.filter(a => a.status === "offen").length,
    bearbeitung: aufgaben.filter(a => a.status === "in_bearbeitung").length,
    erledigt: aufgaben.filter(a => a.status === "erledigt").length,
    ueberfaellig: aufgaben.filter(a => a.deadline && new Date(a.deadline) < new Date() && a.status !== "erledigt").length,
  };

  // Gantt berechnung
  const ganttData = useMemo(() => {
    const withDeadline = aufgaben.filter(a => a.deadline);
    if (withDeadline.length === 0) return null;

    const dates = withDeadline.map(a => new Date(a.deadline!).getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const today = new Date().getTime();
    const rangeStart = Math.min(min, today) - 7 * 86400000;
    const rangeEnd = Math.max(max, today) + 7 * 86400000;
    const totalDays = (rangeEnd - rangeStart) / 86400000;

    return { rangeStart, rangeEnd, totalDays, today };
  }, [aufgaben]);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-dpsg-blue" />
          <h2 className="text-lg font-bold text-dpsg-gray-900">Aufgaben</h2>
          <span className="text-xs text-dpsg-gray-400">{stats.offen} offen, {stats.erledigt} erledigt</span>
          {stats.ueberfaellig > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">
              <AlertTriangle className="h-3 w-3" /> {stats.ueberfaellig} überfällig
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-dpsg-gray-200 overflow-hidden">
            <button onClick={() => setView("liste")}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${view === "liste" ? "bg-dpsg-blue text-white" : "bg-white text-dpsg-gray-600"}`}>
              Liste
            </button>
            <button onClick={() => setView("gantt")}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${view === "gantt" ? "bg-dpsg-blue text-white" : "bg-white text-dpsg-gray-600"}`}>
              Gantt
            </button>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors">
            <Plus className="h-3.5 w-3.5" /> Aufgabe
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {stats.gesamt > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-dpsg-gray-500 mb-1">
            <span>{Math.round((stats.erledigt / stats.gesamt) * 100)}% erledigt</span>
            <span>{stats.erledigt} / {stats.gesamt}</span>
          </div>
          <div className="h-2 rounded-full bg-dpsg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(stats.erledigt / stats.gesamt) * 100}%` }} />
          </div>
        </div>
      )}

      {view === "liste" ? (
        /* === LIST VIEW === */
        <div className="space-y-4">
          {PHASEN.map(phase => {
            const items = grouped[phase.id] || [];
            const open = expandedPhasen[phase.id] !== false;
            return (
              <div key={phase.id} className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm">
                <button onClick={() => setExpandedPhasen(p => ({ ...p, [phase.id]: !open }))}
                  className="w-full flex items-center justify-between border-b border-dpsg-gray-100 bg-dpsg-gray-50 px-5 py-3 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    {open ? <ChevronDown className="h-4 w-4 text-dpsg-gray-400" /> : <ChevronRight className="h-4 w-4 text-dpsg-gray-400" />}
                    <div className="w-3 h-3 rounded" style={{ background: phase.color }} />
                    <span className="text-sm font-bold text-dpsg-gray-900">{phase.label}</span>
                    <span className="text-xs text-dpsg-gray-400">({items.length})</span>
                  </div>
                  <span className="text-xs text-dpsg-gray-400">
                    {items.filter(a => a.status === "erledigt").length}/{items.length} erledigt
                  </span>
                </button>
                {open && (
                  <div>
                    {items.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-dpsg-gray-400">Keine Aufgaben in dieser Phase.</div>
                    ) : items.map(a => {
                      const st = STATUS_ICONS[a.status] || STATUS_ICONS.offen;
                      const StatusIcon = st.icon;
                      const prio = PRIO.find(p => p.id === a.prioritaet);
                      const isOverdue = a.deadline && new Date(a.deadline) < new Date() && a.status !== "erledigt";
                      return (
                        <div key={a.id} className={`flex items-center gap-3 px-5 py-3 border-b border-dpsg-gray-50 hover:bg-dpsg-gray-50 transition-colors ${a.status === "erledigt" ? "opacity-60" : ""}`}>
                          <button onClick={() => toggleStatus(a)} title={`Status: ${st.label}`}>
                            <StatusIcon className="h-5 w-5 flex-shrink-0" style={{ color: st.color }} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold ${a.status === "erledigt" ? "line-through text-dpsg-gray-400" : "text-dpsg-gray-900"}`}>
                              {a.titel}
                            </div>
                            {(a.zugewiesen_an_name || a.zugewiesen_name || a.deadline) && (
                              <div className="flex items-center gap-3 mt-0.5 text-[10px] text-dpsg-gray-400">
                                {(a.zugewiesen_an_name || a.zugewiesen_name) && (
                                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {a.zugewiesen_an_name || a.zugewiesen_name}</span>
                                )}
                                {a.deadline && (
                                  <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-bold" : ""}`}>
                                    <Calendar className="h-3 w-3" /> {formatDate(a.deadline)}
                                    {isOverdue && " (überfällig!)"}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {prio && (
                            <prio.icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: prio.color }} />
                          )}
                          <button onClick={() => deleteAufgabe(a.id)} className="text-dpsg-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* === GANTT VIEW === */
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm overflow-hidden">
          {ganttData ? (
            <div className="overflow-x-auto">
              <div style={{ minWidth: 800 }}>
                {/* Timeline header */}
                <div className="flex border-b border-dpsg-gray-100 bg-dpsg-gray-50">
                  <div className="w-64 flex-shrink-0 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">Aufgabe</div>
                  <div className="flex-1 relative" style={{ height: 32 }}>
                    {Array.from({ length: Math.ceil(ganttData.totalDays / 7) }, (_, i) => {
                      const date = new Date(ganttData.rangeStart + i * 7 * 86400000);
                      const left = (i * 7 / ganttData.totalDays) * 100;
                      return (
                        <div key={i} className="absolute text-[10px] text-dpsg-gray-400 top-2" style={{ left: `${left}%` }}>
                          {date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                        </div>
                      );
                    })}
                    {/* Today line */}
                    <div className="absolute top-0 bottom-0 w-px bg-dpsg-red z-10"
                      style={{ left: `${((ganttData.today - ganttData.rangeStart) / (ganttData.rangeEnd - ganttData.rangeStart)) * 100}%` }} />
                  </div>
                </div>

                {/* Aufgaben rows */}
                {aufgaben.filter(a => a.deadline).map(a => {
                  const phase = PHASEN.find(p => p.id === a.phase);
                  const deadlineTime = new Date(a.deadline!).getTime();
                  const pos = ((deadlineTime - ganttData.rangeStart) / (ganttData.rangeEnd - ganttData.rangeStart)) * 100;
                  const st = STATUS_ICONS[a.status] || STATUS_ICONS.offen;
                  const isOverdue = deadlineTime < ganttData.today && a.status !== "erledigt";

                  return (
                    <div key={a.id} className="flex border-b border-dpsg-gray-50 hover:bg-dpsg-gray-50 transition-colors">
                      <div className="w-64 flex-shrink-0 px-4 py-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded" style={{ background: phase?.color }} />
                        <span className={`text-xs truncate ${a.status === "erledigt" ? "line-through text-dpsg-gray-400" : "text-dpsg-gray-800"}`}>
                          {a.titel}
                        </span>
                      </div>
                      <div className="flex-1 relative" style={{ height: 32 }}>
                        <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `calc(${pos}% - 6px)` }}>
                          <div className={`w-3 h-3 rounded-full border-2 ${
                            a.status === "erledigt" ? "bg-green-500 border-green-600" :
                            isOverdue ? "bg-red-500 border-red-600" :
                            "border-dpsg-blue"
                          }`} style={{ background: a.status === "erledigt" ? "#15803d" : isOverdue ? "#dc2626" : phase?.color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-dpsg-gray-400">
              Setze Deadlines bei Aufgaben, um die Gantt-Ansicht zu sehen.
            </div>
          )}
        </div>
      )}

      {aufgaben.length === 0 && (
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-12 text-center mt-4">
          <ClipboardList className="h-12 w-12 text-dpsg-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-dpsg-gray-700 mb-2">Noch keine Aufgaben</h3>
          <p className="text-sm text-dpsg-gray-500 mb-6">Erstelle Aufgaben für Vorbereitung, Durchführung und Nachbereitung.</p>
          <button onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-dpsg-red px-5 py-2.5 text-sm font-bold text-white hover:bg-dpsg-red-light transition-colors">
            <Plus className="h-4 w-4" /> Erste Aufgabe anlegen
          </button>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl bg-white shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between border-b border-dpsg-gray-100 px-5 py-4">
              <h3 className="text-base font-bold text-dpsg-gray-900">Neue Aufgabe</h3>
              <button onClick={() => setShowAdd(false)} className="text-dpsg-gray-400 hover:text-dpsg-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Titel *</label>
                <input value={newAufgabe.titel} onChange={e => setNewAufgabe({ ...newAufgabe, titel: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                  placeholder="z.B. Seminarhaus buchen" autoFocus />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-dpsg-gray-600">Phase</label>
                <div className="flex gap-2">
                  {PHASEN.map(p => (
                    <button key={p.id} onClick={() => setNewAufgabe({ ...newAufgabe, phase: p.id })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        newAufgabe.phase === p.id ? "border-dpsg-blue bg-dpsg-blue/10 text-dpsg-blue" : "border-dpsg-gray-200 text-dpsg-gray-600"
                      }`}>
                      <div className="w-2 h-2 rounded" style={{ background: p.color }} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Deadline</label>
                  <input type="date" value={newAufgabe.deadline} onChange={e => setNewAufgabe({ ...newAufgabe, deadline: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Zugewiesen an</label>
                  <input value={newAufgabe.zugewiesen_name} onChange={e => setNewAufgabe({ ...newAufgabe, zugewiesen_name: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none"
                    placeholder="Name" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-dpsg-gray-600">Priorität</label>
                <div className="flex gap-2">
                  {PRIO.map(p => (
                    <button key={p.id} onClick={() => setNewAufgabe({ ...newAufgabe, prioritaet: p.id })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        newAufgabe.prioritaet === p.id ? "border-dpsg-blue bg-dpsg-blue/10 text-dpsg-blue" : "border-dpsg-gray-200 text-dpsg-gray-600"
                      }`}>
                      <p.icon className="h-3 w-3" style={{ color: p.color }} /> {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Beschreibung</label>
                <textarea value={newAufgabe.beschreibung} onChange={e => setNewAufgabe({ ...newAufgabe, beschreibung: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none"
                  rows={2} placeholder="Details..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-dpsg-gray-100 px-5 py-4">
              <button onClick={() => setShowAdd(false)}
                className="rounded-lg bg-dpsg-gray-100 px-4 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
                Abbrechen
              </button>
              <button onClick={createAufgabe} disabled={!newAufgabe.titel.trim()}
                className="rounded-lg bg-dpsg-blue px-4 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors disabled:opacity-50">
                Anlegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
