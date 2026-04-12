"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  ClipboardList, Plus, Trash2, X, Check, Loader2,
  ChevronDown, Calendar, Flag, User, Pencil,
  CircleDot, Circle, CheckCircle2, AlertTriangle,
  GripVertical, MoreVertical
} from "lucide-react";

interface Aufgabe {
  id: number;
  parent_id?: number;
  titel: string;
  beschreibung?: string;
  zugewiesen_name?: string;
  zugewiesen_an_name?: string;
  status: string;
  prioritaet: string;
  deadline?: string;
  phase?: string;
}

interface Bucket {
  id: number;
  name: string;
  farbe: string;
}

const PHASEN = [
  { id: "vorbereitung", label: "Vorbereitung", color: "#003056" },
  { id: "waehrend", label: "Während des Kurses", color: "#0891b2" },
  { id: "nachbereitung", label: "Nachbereitung", color: "#7c3aed" },
];

const STUNDEN_GANTT = Array.from({ length: 52 }, (_, i) => i); // weeks placeholder

const PRIO: Record<string, { color: string; label: string }> = {
  niedrig: { color: "#9e9a92", label: "Niedrig" },
  mittel: { color: "#b45309", label: "Mittel" },
  hoch: { color: "#dc2626", label: "Hoch" },
  dringend: { color: "#b91c1c", label: "Dringend" },
};

const STATUS_ICONS: Record<string, { icon: any; color: string }> = {
  offen: { icon: Circle, color: "#9e9a92" },
  in_bearbeitung: { icon: CircleDot, color: "#003056" },
  erledigt: { icon: CheckCircle2, color: "#15803d" },
};

export default function AufgabenPage() {
  const params = useParams();
  const kursId = params.id as string;

  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [view, setView] = useState<"kanban" | "gantt">("kanban");
  const [filterPhase, setFilterPhase] = useState<string>("alle");
  const [showAdd, setShowAdd] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [newTitel, setNewTitel] = useState("");
  const [editBucketId, setEditBucketId] = useState<number | null>(null);
  const [editBucketName, setEditBucketName] = useState("");
  const [addSubFor, setAddSubFor] = useState<number | null>(null);
  const [newSubTitel, setNewSubTitel] = useState("");
  const [showErledigt, setShowErledigt] = useState<Record<string, boolean>>({});
  const [teamMembers, setTeamMembers] = useState<Array<{id: number; name: string; rolle: string}>>([]);

  useEffect(() => { load(); loadTeam(); }, [kursId]);

  async function load() {
    if (!initialized) setLoading(true);
    try {
      const res = await fetch(`/api/aufgaben/${kursId}`);
      if (res.ok) {
        const data = await res.json();
        setBuckets(data.buckets || []);
        setAufgaben(data.aufgaben || []);
      }
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }

  async function loadTeam() {
    try {
      const res = await fetch(`/api/team/${kursId}`);
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.map((m: any) => ({ id: m.id, name: m.name || m.user_name || "Unbekannt", rolle: m.rolle })));
      }
    } catch {}
  }

  async function createAufgabe(bucketName: string) {
    if (!newTitel.trim()) return;
    await fetch(`/api/aufgaben/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", titel: newTitel, phase: bucketName }),
    });
    await load();
    setShowAdd(null);
    setNewTitel("");
  }

  async function createSubtask(parentId: number, bucketName: string) {
    if (!newSubTitel.trim()) return;
    await fetch(`/api/aufgaben/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", titel: newSubTitel, phase: bucketName, parent_id: parentId }),
    });
    await load();
    setAddSubFor(null);
    setNewSubTitel("");
  }

  async function updateAufgabe(id: number, updates: Record<string, any>) {
    await fetch(`/api/aufgaben/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", aufgabe_id: id, ...updates }),
    });
    await load();
  }

  async function toggleStatus(a: Aufgabe) {
    const next = a.status === "offen" ? "in_bearbeitung" : a.status === "in_bearbeitung" ? "erledigt" : "offen";
    await updateAufgabe(a.id, { status: next });
  }

  async function deleteAufgabe(id: number) {
    await fetch(`/api/aufgaben/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", aufgabe_id: id }),
    });
    await load();
  }

  async function addBucket() {
    await fetch(`/api/aufgaben/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_bucket" }),
    });
    await load();
  }

  async function renameBucket(id: number, name: string) {
    const bucket = buckets.find(b => b.id === id);
    if (!bucket) return;
    // Also update aufgaben that reference old name
    const oldName = bucket.name;
    await fetch(`/api/aufgaben/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_bucket", bucket_id: id, name, farbe: bucket.farbe }),
    });
    // Update aufgaben phase references
    for (const a of aufgaben.filter(a => a.phase === oldName)) {
      await updateAufgabe(a.id, { phase: name });
    }
    await load();
    setEditBucketId(null);
  }

  async function deleteBucket(id: number) {
    await fetch(`/api/aufgaben/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_bucket", bucket_id: id }),
    });
    await load();
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  }

  const stats = {
    gesamt: aufgaben.length,
    erledigt: aufgaben.filter(a => a.status === "erledigt").length,
    ueberfaellig: aufgaben.filter(a => a.deadline && new Date(a.deadline) < new Date() && a.status !== "erledigt").length,
  };

  // Gantt data
  const ganttData = useMemo(() => {
    const withDeadline = aufgaben.filter(a => a.deadline);
    if (withDeadline.length === 0) return null;
    const dates = withDeadline.map(a => new Date(a.deadline!).getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const today = new Date().getTime();
    const rangeStart = Math.min(min, today) - 7 * 86400000;
    const rangeEnd = Math.max(max, today) + 14 * 86400000;
    const totalDays = (rangeEnd - rangeStart) / 86400000;
    return { rangeStart, rangeEnd, totalDays, today };
  }, [aufgaben]);

  // Filtered aufgaben
  const filteredAufgaben = filterPhase === "alle" ? aufgaben : aufgaben.filter(a => {
    // Match either bucket name or legacy phase field
    const bucket = buckets.find(b => b.name === a.phase);
    if (filterPhase === "vorbereitung" || filterPhase === "waehrend" || filterPhase === "nachbereitung") {
      return a.phase === filterPhase;
    }
    return a.phase === filterPhase;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;
  }

  const detailAufgabe = detailId ? aufgaben.find(a => a.id === detailId) : null;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-dpsg-blue" />
          <h2 className="text-lg font-bold text-dpsg-gray-900">Aufgaben</h2>
          {stats.gesamt > 0 && (
            <span className="text-xs text-dpsg-gray-400">{stats.erledigt}/{stats.gesamt} erledigt</span>
          )}
          {stats.ueberfaellig > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">
              <AlertTriangle className="h-3 w-3" /> {stats.ueberfaellig} überfällig
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-dpsg-gray-200 overflow-hidden">
            <button onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${view === "kanban" ? "bg-dpsg-blue text-white" : "bg-white text-dpsg-gray-600"}`}>
              Kanban
            </button>
            <button onClick={() => setView("gantt")}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${view === "gantt" ? "bg-dpsg-blue text-white" : "bg-white text-dpsg-gray-600"}`}>
              Gantt
            </button>
          </div>
          {view === "kanban" && (
            <button onClick={addBucket}
              className="flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Bucket
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {stats.gesamt > 0 && (
        <div className="mb-4">
          <div className="h-1.5 rounded-full bg-dpsg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(stats.erledigt / stats.gesamt) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Phase filter for Gantt */}
      {view === "gantt" && (
        <div className="flex gap-1.5 mb-4">
          <button onClick={() => setFilterPhase("alle")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterPhase === "alle" ? "bg-dpsg-blue text-white" : "bg-white border border-dpsg-gray-200 text-dpsg-gray-600"
            }`}>Alle</button>
          {PHASEN.map(p => (
            <button key={p.id} onClick={() => setFilterPhase(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterPhase === p.id ? "border-dpsg-blue bg-dpsg-blue/10 text-dpsg-blue" : "border-dpsg-gray-200 text-dpsg-gray-600"
              }`}>
              <div className="w-2 h-2 rounded" style={{ background: p.color }} />
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Gantt View */}
      {view === "gantt" && (
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm overflow-hidden">
          {ganttData ? (
            <div className="overflow-x-auto">
              <div style={{ minWidth: 800 }}>
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
                    <div className="absolute top-0 bottom-0 w-px bg-dpsg-red z-10"
                      style={{ left: `${((ganttData.today - ganttData.rangeStart) / (ganttData.rangeEnd - ganttData.rangeStart)) * 100}%` }} />
                  </div>
                </div>
                {filteredAufgaben.filter(a => a.deadline).map(a => {
                  const bucket = buckets.find(b => b.name === a.phase);
                  const deadlineTime = new Date(a.deadline!).getTime();
                  const pos = ((deadlineTime - ganttData.rangeStart) / (ganttData.rangeEnd - ganttData.rangeStart)) * 100;
                  const isOverdue = deadlineTime < ganttData.today && a.status !== "erledigt";
                  const person = a.zugewiesen_an_name || a.zugewiesen_name;
                  return (
                    <div key={a.id} className="flex border-b border-dpsg-gray-50 hover:bg-dpsg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setDetailId(a.id)}>
                      <div className="w-64 flex-shrink-0 px-4 py-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded flex-shrink-0" style={{ background: bucket?.farbe || "#9e9a92" }} />
                        <span className={`text-xs truncate ${a.status === "erledigt" ? "line-through text-dpsg-gray-400" : "text-dpsg-gray-800"}`}>
                          {a.titel}
                        </span>
                        {person && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-dpsg-blue/10 text-dpsg-blue text-[8px] font-bold flex-shrink-0"
                            title={person}>
                            {person.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 relative" style={{ height: 32 }}>
                        <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `calc(${pos}% - 6px)` }}>
                          <div className={`w-3 h-3 rounded-full border-2`}
                            style={{ background: a.status === "erledigt" ? "#15803d" : isOverdue ? "#dc2626" : bucket?.farbe || "#003056",
                              borderColor: a.status === "erledigt" ? "#166534" : isOverdue ? "#991b1b" : bucket?.farbe || "#003056" }} />
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

      {/* Kanban Board */}
      {view === "kanban" && <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {buckets.map(bucket => {
          const bucketTasks = aufgaben.filter(a => a.phase === bucket.name);
          const openTasks = bucketTasks.filter(a => a.status !== "erledigt" && !a.parent_id);
          const doneTasks = bucketTasks.filter(a => a.status === "erledigt" && !a.parent_id);
          const isShowErledigt = showErledigt[bucket.name] || false;

          return (
            <div key={bucket.id} className="flex-shrink-0 w-72 flex flex-col">
              {/* Bucket Header */}
              <div className="flex items-center justify-between mb-2 px-1">
                {editBucketId === bucket.id ? (
                  <input value={editBucketName} onChange={e => setEditBucketName(e.target.value)}
                    onBlur={() => { if (editBucketName.trim()) renameBucket(bucket.id, editBucketName); else setEditBucketId(null); }}
                    onKeyDown={e => { if (e.key === "Enter" && editBucketName.trim()) renameBucket(bucket.id, editBucketName); }}
                    className="text-sm font-bold text-dpsg-gray-900 bg-white border border-dpsg-blue rounded px-2 py-0.5 focus:outline-none"
                    autoFocus />
                ) : (
                  <h3 className="text-sm font-bold text-dpsg-gray-900 cursor-pointer"
                    onClick={() => { setEditBucketId(bucket.id); setEditBucketName(bucket.name); }}>
                    {bucket.name}
                  </h3>
                )}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-dpsg-gray-400">{openTasks.length}</span>
                  {buckets.length > 1 && (
                    <button onClick={() => { if (confirm("Bucket löschen?")) deleteBucket(bucket.id); }}
                      className="p-0.5 rounded text-dpsg-gray-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                  )}
                </div>
              </div>

              {/* Add button */}
              {showAdd === bucket.name ? (
                <div className="rounded-lg border border-dpsg-gray-200 bg-white p-2 mb-2">
                  <input value={newTitel} onChange={e => setNewTitel(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") createAufgabe(bucket.name); if (e.key === "Escape") setShowAdd(null); }}
                    className="w-full rounded border border-dpsg-gray-200 px-2 py-1.5 text-sm focus:border-dpsg-blue focus:outline-none"
                    placeholder="Aufgabentitel..." autoFocus />
                  <div className="flex gap-1 mt-1.5">
                    <button onClick={() => createAufgabe(bucket.name)} disabled={!newTitel.trim()}
                      className="rounded bg-dpsg-blue px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50">Hinzufügen</button>
                    <button onClick={() => { setShowAdd(null); setNewTitel(""); }}
                      className="rounded bg-dpsg-gray-100 px-2 py-1 text-[10px] font-bold text-dpsg-gray-600">Abbrechen</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAdd(bucket.name)}
                  className="w-full flex items-center gap-1.5 rounded-lg border border-dashed border-dpsg-gray-200 px-3 py-2 mb-2 text-xs text-dpsg-gray-400 hover:border-dpsg-blue hover:text-dpsg-blue transition-colors">
                  <Plus className="h-3 w-3" /> Aufgabe hinzufügen
                </button>
              )}

              {/* Task Cards */}
              <div className="flex-1 space-y-2">
                {openTasks.map(a => {
                  const st = STATUS_ICONS[a.status] || STATUS_ICONS.offen;
                  const StatusIcon = st.icon;
                  const prio = PRIO[a.prioritaet];
                  const isOverdue = a.deadline && new Date(a.deadline) < new Date();
                  const person = a.zugewiesen_an_name || a.zugewiesen_name;
                  const subs = aufgaben.filter(s => s.parent_id === a.id);

                  return (
                    <div key={a.id} className="rounded-lg border border-dpsg-gray-200 bg-white hover:shadow-md transition-shadow">
                      <div className="p-3 cursor-pointer" onClick={() => setDetailId(a.id)}>
                        <div className="flex items-start gap-2">
                          <button onClick={e => { e.stopPropagation(); toggleStatus(a); }} className="mt-0.5 flex-shrink-0">
                            <StatusIcon className="h-4 w-4" style={{ color: st.color }} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-dpsg-gray-900">{a.titel}</div>
                            {a.beschreibung && (
                              <div className="text-[10px] text-dpsg-gray-500 mt-0.5 line-clamp-2">{a.beschreibung}</div>
                            )}
                          </div>
                        </div>
                        {(a.deadline || person || subs.length > 0) && (
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              {a.deadline && (
                                <span className={`flex items-center gap-0.5 text-[10px] ${isOverdue ? "text-red-600 font-bold" : "text-dpsg-gray-400"}`}>
                                  <Calendar className="h-3 w-3" /> {formatDate(a.deadline)}{isOverdue ? "!":""}
                                </span>
                              )}
                              {subs.length > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] text-dpsg-gray-400">
                                  <CheckCircle2 className="h-3 w-3" /> {subs.filter(s => s.status === "erledigt").length}/{subs.length}
                                </span>
                              )}
                            </div>
                            {person && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-dpsg-blue text-white text-[9px] font-bold"
                                title={person}>
                                {person.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Subtasks */}
                      {subs.length > 0 && (
                        <div className="border-t border-dpsg-gray-100 px-3 py-1.5">
                          {subs.map(sub => {
                            const subSt = STATUS_ICONS[sub.status] || STATUS_ICONS.offen;
                            const SubIcon = subSt.icon;
                            return (
                              <div key={sub.id} className="flex items-center gap-2 py-1 group">
                                <button onClick={() => toggleStatus(sub)} className="flex-shrink-0">
                                  <SubIcon className="h-3.5 w-3.5" style={{ color: subSt.color }} />
                                </button>
                                <span className={`text-xs flex-1 ${sub.status === "erledigt" ? "line-through text-dpsg-gray-400" : "text-dpsg-gray-700"}`}
                                  onClick={() => setDetailId(sub.id)} style={{ cursor: "pointer" }}>
                                  {sub.titel}
                                </span>
                                <button onClick={() => deleteAufgabe(sub.id)}
                                  className="opacity-0 group-hover:opacity-100 text-dpsg-gray-300 hover:text-red-500 transition-all">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Add subtask */}
                      {addSubFor === a.id ? (
                        <div className="border-t border-dpsg-gray-100 px-3 py-2">
                          <input value={newSubTitel} onChange={e => setNewSubTitel(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") createSubtask(a.id, bucket.name); if (e.key === "Escape") setAddSubFor(null); }}
                            className="w-full rounded border border-dpsg-gray-200 px-2 py-1 text-xs focus:border-dpsg-blue focus:outline-none"
                            placeholder="Unteraufgabe..." autoFocus />
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setAddSubFor(a.id); setNewSubTitel(""); }}
                          className="w-full border-t border-dpsg-gray-100 px-3 py-1.5 text-[10px] text-dpsg-gray-400 hover:text-dpsg-blue hover:bg-dpsg-gray-50 text-left transition-colors">
                          + Unteraufgabe
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Erledigte */}
                {doneTasks.length > 0 && (
                  <button onClick={() => setShowErledigt(prev => ({ ...prev, [bucket.name]: !isShowErledigt }))}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-dpsg-gray-400 hover:text-dpsg-gray-600">
                    <span>Erledigte Aufgaben</span>
                    <span className="flex items-center gap-1">{doneTasks.length} <ChevronDown className={`h-3 w-3 transition-transform ${isShowErledigt ? "rotate-180" : ""}`} /></span>
                  </button>
                )}
                {isShowErledigt && doneTasks.map(a => (
                  <div key={a.id} className="rounded-lg border border-dpsg-gray-100 bg-dpsg-gray-50 p-3 opacity-60 cursor-pointer"
                    onClick={() => setDetailId(a.id)}>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); toggleStatus(a); }}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </button>
                      <span className="text-sm text-dpsg-gray-400 line-through">{a.titel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      }

      {/* Detail Modal */}
      {detailAufgabe && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" key={`detail-${detailAufgabe.id}-${JSON.stringify(detailAufgabe).length}`}>
          <div className="rounded-xl bg-white shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-dpsg-gray-100 px-5 py-4">
              <h3 className="text-base font-bold text-dpsg-gray-900">Aufgabe bearbeiten</h3>
              <button onClick={() => setDetailId(null)} className="text-dpsg-gray-400 hover:text-dpsg-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Titel</label>
                <input defaultValue={detailAufgabe.titel}
                  onBlur={e => { if (e.target.value !== detailAufgabe.titel) updateAufgabe(detailAufgabe.id, { titel: e.target.value }); }}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
              </div>
              {/* Subtasks in detail */}
              {(() => {
                const detailSubs = aufgaben.filter(s => s.parent_id === detailAufgabe.id);
                return detailSubs.length > 0 ? (
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-dpsg-gray-600">
                      Unteraufgaben ({detailSubs.filter(s => s.status === "erledigt").length}/{detailSubs.length})
                    </label>
                    <div className="space-y-1">
                      {detailSubs.map(sub => {
                        const subSt = STATUS_ICONS[sub.status] || STATUS_ICONS.offen;
                        const SubIcon = subSt.icon;
                        return (
                          <div key={sub.id} className="flex items-center gap-2 group">
                            <button onClick={() => toggleStatus(sub)}><SubIcon className="h-4 w-4" style={{ color: subSt.color }} /></button>
                            <span className={`text-sm flex-1 ${sub.status === "erledigt" ? "line-through text-dpsg-gray-400" : "text-dpsg-gray-800"}`}>{sub.titel}</span>
                            <button onClick={() => deleteAufgabe(sub.id)} className="opacity-0 group-hover:opacity-100 text-dpsg-gray-300 hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Beschreibung</label>
                <textarea defaultValue={detailAufgabe.beschreibung || ""} rows={3}
                  onBlur={e => updateAufgabe(detailAufgabe.id, { beschreibung: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                  placeholder="Details, Materialien, Links..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Zugewiesen an</label>
                  {teamMembers.length > 0 ? (
                    <select defaultValue={detailAufgabe.zugewiesen_name || ""} onChange={e => updateAufgabe(detailAufgabe.id, { zugewiesen_name: e.target.value })}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none">
                      <option value="">Nicht zugewiesen</option>
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.name}>{m.name} ({m.rolle})</option>
                      ))}
                    </select>
                  ) : (
                    <input defaultValue={detailAufgabe.zugewiesen_name || ""}
                      onBlur={e => updateAufgabe(detailAufgabe.id, { zugewiesen_name: e.target.value })}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" />
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Deadline</label>
                  <input type="date" defaultValue={detailAufgabe.deadline || ""}
                    onChange={e => updateAufgabe(detailAufgabe.id, { deadline: e.target.value || null })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-dpsg-gray-600">Phase</label>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {PHASEN.map(p => (
                    <button key={p.id} onClick={() => updateAufgabe(detailAufgabe.id, { phase: p.id })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        detailAufgabe.phase === p.id ? "border-dpsg-blue bg-dpsg-blue/10 text-dpsg-blue" : "border-dpsg-gray-200 text-dpsg-gray-600"
                      }`}>
                      <div className="w-2 h-2 rounded" style={{ background: p.color }} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-dpsg-gray-600">Bucket</label>
                <div className="flex flex-wrap gap-1.5">
                  {buckets.map(b => (
                    <button key={b.id} onClick={() => updateAufgabe(detailAufgabe.id, { phase: b.name })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        detailAufgabe.phase === b.name ? "border-dpsg-blue bg-dpsg-blue/10 text-dpsg-blue" : "border-dpsg-gray-200 text-dpsg-gray-600"
                      }`}>{b.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-dpsg-gray-600">Priorität</label>
                <div className="flex gap-2">
                  {Object.entries(PRIO).map(([id, p]) => (
                    <button key={id} onClick={() => updateAufgabe(detailAufgabe.id, { prioritaet: id })}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        detailAufgabe.prioritaet === id ? "border-dpsg-blue bg-dpsg-blue/10 text-dpsg-blue" : "border-dpsg-gray-200 text-dpsg-gray-600"
                      }`}>
                      <Flag className="h-3 w-3" style={{ color: p.color }} /> {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-dpsg-gray-100 px-5 py-4">
              <button onClick={() => { deleteAufgabe(detailAufgabe.id); setDetailId(null); }}
                className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-bold text-red-700">
                <Trash2 className="h-3.5 w-3.5" /> Löschen
              </button>
              <button onClick={() => setDetailId(null)}
                className="rounded-lg bg-dpsg-blue px-4 py-2 text-xs font-bold text-white">Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
