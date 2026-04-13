"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Calendar, Plus, Trash2, X, Save, Loader2, Check, Clock,
  Coffee, Utensils, Music, Users, BookOpen, Sun, Moon,
  ChevronLeft, ChevronRight, GripVertical, Pencil, Copy
} from "lucide-react";

interface Block {
  id?: number;
  programm_id: number;
  start_zeit: string;
  end_zeit: string;
  titel: string;
  beschreibung?: string;
  raum?: string;
  verantwortlich?: string;
  typ: string;
  farbe?: string;
}

interface Tag {
  id: number;
  tag_nummer: number;
  tag_titel: string;
  blocks: Block[];
}

const BLOCK_TYPEN = [
  { id: "programm", label: "Programm", icon: BookOpen, color: "#003056", bg: "#003056" },
  { id: "workshop", label: "Workshop", icon: Users, color: "#7c3aed", bg: "#7c3aed" },
  { id: "plenum", label: "Plenum", icon: Users, color: "#0891b2", bg: "#0891b2" },
  { id: "pause", label: "Pause", icon: Coffee, color: "#9e9a92", bg: "#9e9a92" },
  { id: "essen", label: "Essen", icon: Utensils, color: "#b45309", bg: "#b45309" },
  { id: "freizeit", label: "Freizeit", icon: Music, color: "#15803d", bg: "#15803d" },
  { id: "orga", label: "Orga/Team", icon: GripVertical, color: "#8b0a1e", bg: "#8b0a1e" },
];

const STUNDEN = Array.from({ length: 19 }, (_, i) => i + 6); // 6:00 - 24:00

function zeitToMinuten(zeit: string): number {
  const [h, m] = zeit.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutenToZeit(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Standard-Tagesblöcke
const STANDARD_BLOECKE: Omit<Block, "id" | "programm_id">[] = [
  { start_zeit: "07:00", end_zeit: "07:30", titel: "Wecken & Morgentoilette", typ: "pause" },
  { start_zeit: "07:30", end_zeit: "08:15", titel: "Frühstück", typ: "essen" },
  { start_zeit: "08:15", end_zeit: "08:45", titel: "Morgenrunde", typ: "plenum" },
  { start_zeit: "09:00", end_zeit: "10:30", titel: "Einheit 1", typ: "programm" },
  { start_zeit: "10:30", end_zeit: "11:00", titel: "Pause", typ: "pause" },
  { start_zeit: "11:00", end_zeit: "12:30", titel: "Einheit 2", typ: "programm" },
  { start_zeit: "12:30", end_zeit: "13:30", titel: "Mittagessen", typ: "essen" },
  { start_zeit: "13:30", end_zeit: "14:00", titel: "Mittagspause", typ: "freizeit" },
  { start_zeit: "14:00", end_zeit: "15:30", titel: "Einheit 3", typ: "programm" },
  { start_zeit: "15:30", end_zeit: "16:00", titel: "Kaffee & Kuchen", typ: "pause" },
  { start_zeit: "16:00", end_zeit: "17:30", titel: "Einheit 4", typ: "programm" },
  { start_zeit: "18:00", end_zeit: "19:00", titel: "Abendessen", typ: "essen" },
  { start_zeit: "19:30", end_zeit: "21:00", titel: "Abendprogramm", typ: "freizeit" },
  { start_zeit: "21:00", end_zeit: "21:30", titel: "Tagesabschluss", typ: "plenum" },
];

export default function ProgrammPage() {
  const params = useParams();
  const kursId = params.id as string;

  const [tage, setTage] = useState<Tag[]>([]);
  const [activeTag, setActiveTag] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editBlock, setEditBlock] = useState<Block | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBlock, setNewBlock] = useState<Partial<Block>>({
    start_zeit: "09:00", end_zeit: "10:30", titel: "", typ: "programm"
  });

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadProgramm(); }, [kursId]);

  async function loadProgramm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/programm/${kursId}`);
      const data = await res.json();

      if (data.length === 0) {
        // Init 8 days
        await fetch(`/api/programm/${kursId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "init_tage", anzahl_tage: 8 }),
        });
        const res2 = await fetch(`/api/programm/${kursId}`);
        setTage(await res2.json());
      } else {
        setTage(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const currentTag = tage.find(t => t.tag_nummer === activeTag);

  async function addBlock() {
    if (!currentTag || !newBlock.titel) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/programm/${kursId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_block",
          programm_id: currentTag.id,
          ...newBlock,
        }),
      });
      if (res.ok) {
        await loadProgramm();
        setShowAddModal(false);
        setNewBlock({ start_zeit: "09:00", end_zeit: "10:30", titel: "", typ: "programm" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateBlock(block: Block) {
    setSaving(true);
    try {
      await fetch(`/api/programm/${kursId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_block", block_id: block.id, ...block }),
      });
      await loadProgramm();
      setEditBlock(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  async function deleteBlock(blockId: number) {
    await fetch(`/api/programm/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_block", block_id: blockId }),
    });
    await loadProgramm();
    setEditBlock(null);
  }

  async function fillStandard() {
    if (!currentTag) return;
    setSaving(true);
    try {
      for (const block of STANDARD_BLOECKE) {
        await fetch(`/api/programm/${kursId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add_block", programm_id: currentTag.id, ...block }),
        });
      }
      await loadProgramm();
    } finally {
      setSaving(false);
    }
  }

  async function copyDay(fromTag: number) {
    const srcTag = tage.find(t => t.tag_nummer === fromTag);
    const destTag = currentTag;
    if (!srcTag || !destTag || srcTag.blocks.length === 0) return;
    setSaving(true);
    try {
      for (const block of srcTag.blocks) {
        await fetch(`/api/programm/${kursId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_block", programm_id: destTag.id,
            start_zeit: block.start_zeit, end_zeit: block.end_zeit,
            titel: block.titel, beschreibung: block.beschreibung,
            raum: block.raum, verantwortlich: block.verantwortlich,
            typ: block.typ, farbe: block.farbe,
          }),
        });
      }
      await loadProgramm();
    } finally {
      setSaving(false);
    }
  }

  async function updateTagTitel(tagId: number, titel: string) {
    await fetch(`/api/programm/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_tag", tag_id: tagId, tag_titel: titel }),
    });
    setTage(tage.map(t => t.id === tagId ? { ...t, tag_titel: titel } : t));
  }

  function getBlockStyle(block: Block) {
    const typDef = BLOCK_TYPEN.find(t => t.id === block.typ) || BLOCK_TYPEN[0];
    const startMin = zeitToMinuten(block.start_zeit) - 360; // offset from 6:00
    const endMin = zeitToMinuten(block.end_zeit) - 360;
    const top = (startMin / 60) * 64; // 64px per hour
    const height = Math.max(((endMin - startMin) / 60) * 64, 24);

    return {
      position: "absolute" as const,
      top, left: 4, right: 4, height,
      background: typDef.bg + "18",
      borderLeft: `3px solid ${typDef.bg}`,
      borderRadius: 6,
      padding: "4px 8px",
      cursor: "pointer",
      overflow: "hidden" as const,
      transition: "box-shadow 0.15s",
      fontSize: 12,
    };
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-dpsg-blue" />
          <h2 className="text-lg font-bold text-dpsg-gray-900">Tagesplan</h2>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/kurs/${kursId}/programm/druckansicht`} target="_blank"
            className="flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
            Druckansicht
          </a>
          {currentTag && currentTag.blocks.length === 0 && (
            <button onClick={fillStandard} disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
              <Clock className="h-3.5 w-3.5" /> Standard-Tag einfügen
            </button>
          )}
          {tage.filter(t => t.tag_nummer !== activeTag && t.blocks.length > 0).length > 0 && (
            <div className="relative group">
              <button className="flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
                <Copy className="h-3.5 w-3.5" /> Tag kopieren von...
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-dpsg-gray-200 rounded-lg shadow-lg z-10 hidden group-hover:block min-w-[160px]">
                {tage.filter(t => t.tag_nummer !== activeTag && t.blocks.length > 0).map(t => (
                  <button key={t.tag_nummer} onClick={() => copyDay(t.tag_nummer)}
                    className="w-full text-left px-3 py-2 text-xs text-dpsg-gray-700 hover:bg-dpsg-gray-50">
                    Tag {t.tag_nummer}: {t.tag_titel}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors">
            <Plus className="h-3.5 w-3.5" /> Block hinzufügen
          </button>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {tage.map(tag => (
          <button key={tag.tag_nummer} onClick={() => setActiveTag(tag.tag_nummer)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTag === tag.tag_nummer
                ? "bg-dpsg-blue text-white"
                : "bg-white border border-dpsg-gray-200 text-dpsg-gray-600 hover:bg-dpsg-gray-50"
            }`}>
            <div>Tag {tag.tag_nummer}</div>
            <div className={`text-[10px] font-normal mt-0.5 ${activeTag === tag.tag_nummer ? "text-white/70" : "text-dpsg-gray-400"}`}>
              {tag.tag_titel}
              {tag.blocks.length > 0 && ` (${tag.blocks.length})`}
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-5">
        {/* Time Grid */}
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Tag Header */}
          {currentTag && (
            <div className="flex items-center justify-between border-b border-dpsg-gray-100 bg-dpsg-gray-50 px-5 py-3">
              <div className="flex items-center gap-3">
                <input value={currentTag.tag_titel} onChange={e => updateTagTitel(currentTag.id, e.target.value)}
                  className="text-sm font-bold text-dpsg-gray-900 bg-transparent border-none focus:outline-none focus:ring-0"
                  placeholder="Tagesbezeichnung" />
              </div>
              <span className="text-xs text-dpsg-gray-400">{currentTag.blocks.length} Blöcke</span>
            </div>
          )}

          <div className="relative" style={{ height: 19 * 64 }} ref={gridRef}>
            {/* Hour lines */}
            {STUNDEN.map(h => (
              <div key={h} style={{ position: "absolute", top: (h - 6) * 64, left: 0, right: 0 }}>
                <div className="flex items-start">
                  <div className="w-14 pr-2 text-right text-[10px] font-semibold text-dpsg-gray-400 -mt-1.5 select-none">
                    {String(h).padStart(2, "0")}:00
                  </div>
                  <div className="flex-1 border-t border-dpsg-gray-100" />
                </div>
              </div>
            ))}

            {/* Blocks */}
            <div className="absolute inset-0 ml-14">
              {currentTag?.blocks.map(block => {
                const typDef = BLOCK_TYPEN.find(t => t.id === block.typ) || BLOCK_TYPEN[0];
                const Icon = typDef.icon;
                return (
                  <div key={block.id} style={getBlockStyle(block)}
                    onClick={() => setEditBlock(block)}
                    className="hover:shadow-md group">
                    <div className="flex items-center gap-1.5">
                      <Icon size={11} color={typDef.bg} />
                      <span className="font-bold text-dpsg-gray-900 truncate">{block.titel}</span>
                    </div>
                    <div className="text-[10px] text-dpsg-gray-500 mt-0.5">
                      {block.start_zeit} – {block.end_zeit}
                      {block.raum && <> &middot; {block.raum}</>}
                      {block.verantwortlich && <> &middot; {block.verantwortlich}</>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel — Block Types Legend + Quick Actions */}
        <div className="space-y-5">
          <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm">
            <div className="border-b border-dpsg-gray-100 bg-dpsg-gray-50 px-4 py-3 rounded-t-xl">
              <span className="text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">Block-Typen</span>
            </div>
            <div className="p-4 space-y-2">
              {BLOCK_TYPEN.map(typ => {
                const Icon = typ.icon;
                const count = currentTag?.blocks.filter(b => b.typ === typ.id).length || 0;
                return (
                  <div key={typ.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ background: typ.bg }} />
                      <Icon size={12} color={typ.bg} />
                      <span className="text-xs text-dpsg-gray-700">{typ.label}</span>
                    </div>
                    <span className="text-xs text-dpsg-gray-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tagesübersicht */}
          {currentTag && currentTag.blocks.length > 0 && (
            <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm">
              <div className="border-b border-dpsg-gray-100 bg-dpsg-gray-50 px-4 py-3 rounded-t-xl">
                <span className="text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">Ablauf</span>
              </div>
              <div className="p-2 max-h-96 overflow-y-auto">
                {[...currentTag.blocks]
                  .sort((a, b) => zeitToMinuten(a.start_zeit) - zeitToMinuten(b.start_zeit))
                  .map(block => {
                    const typDef = BLOCK_TYPEN.find(t => t.id === block.typ) || BLOCK_TYPEN[0];
                    const Icon = typDef.icon;
                    return (
                      <button key={block.id} onClick={() => setEditBlock(block)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left hover:bg-dpsg-gray-50 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: typDef.bg }} />
                        <span className="text-[10px] text-dpsg-gray-400 w-12 flex-shrink-0 font-mono">{block.start_zeit}</span>
                        <span className="text-xs text-dpsg-gray-800 truncate">{block.titel}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Block Modal */}
      {editBlock && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl bg-white shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between border-b border-dpsg-gray-100 px-5 py-4">
              <h3 className="text-base font-bold text-dpsg-gray-900">Block bearbeiten</h3>
              <button onClick={() => setEditBlock(null)} className="text-dpsg-gray-400 hover:text-dpsg-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Titel</label>
                <input value={editBlock.titel} onChange={e => setEditBlock({ ...editBlock, titel: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Start</label>
                  <input type="time" value={editBlock.start_zeit} onChange={e => setEditBlock({ ...editBlock, start_zeit: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Ende</label>
                  <input type="time" value={editBlock.end_zeit} onChange={e => setEditBlock({ ...editBlock, end_zeit: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Typ</label>
                <div className="flex flex-wrap gap-1.5">
                  {BLOCK_TYPEN.map(typ => (
                    <button key={typ.id} onClick={() => setEditBlock({ ...editBlock, typ: typ.id })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        editBlock.typ === typ.id
                          ? "border-dpsg-blue bg-dpsg-blue/10 text-dpsg-blue"
                          : "border-dpsg-gray-200 text-dpsg-gray-600"
                      }`}>
                      <typ.icon size={12} /> {typ.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Raum</label>
                  <input value={editBlock.raum || ""} onChange={e => setEditBlock({ ...editBlock, raum: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                    placeholder="z.B. Seminarraum 1" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Verantwortlich</label>
                  <input value={editBlock.verantwortlich || ""} onChange={e => setEditBlock({ ...editBlock, verantwortlich: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                    placeholder="Name" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Beschreibung</label>
                <textarea value={editBlock.beschreibung || ""} onChange={e => setEditBlock({ ...editBlock, beschreibung: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                  rows={2} placeholder="Details, Materialien, Hinweise..." />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-dpsg-gray-100 px-5 py-4">
              <button onClick={() => editBlock.id && deleteBlock(editBlock.id)}
                className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors">
                <Trash2 className="h-3.5 w-3.5" /> Löschen
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditBlock(null)}
                  className="rounded-lg bg-dpsg-gray-100 px-4 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
                  Abbrechen
                </button>
                <button onClick={() => updateBlock(editBlock)} disabled={saving}
                  className="rounded-lg bg-dpsg-blue px-4 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors disabled:opacity-50">
                  {saving ? "Speichert..." : "Speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Block Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl bg-white shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between border-b border-dpsg-gray-100 px-5 py-4">
              <h3 className="text-base font-bold text-dpsg-gray-900">Neuer Block</h3>
              <button onClick={() => setShowAddModal(false)} className="text-dpsg-gray-400 hover:text-dpsg-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Titel *</label>
                <input value={newBlock.titel || ""} onChange={e => setNewBlock({ ...newBlock, titel: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                  placeholder="z.B. Workshop Knotenkunde" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Start</label>
                  <input type="time" value={newBlock.start_zeit} onChange={e => setNewBlock({ ...newBlock, start_zeit: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Ende</label>
                  <input type="time" value={newBlock.end_zeit} onChange={e => setNewBlock({ ...newBlock, end_zeit: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Typ</label>
                <div className="flex flex-wrap gap-1.5">
                  {BLOCK_TYPEN.map(typ => (
                    <button key={typ.id} onClick={() => setNewBlock({ ...newBlock, typ: typ.id })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        newBlock.typ === typ.id
                          ? "border-dpsg-blue bg-dpsg-blue/10 text-dpsg-blue"
                          : "border-dpsg-gray-200 text-dpsg-gray-600"
                      }`}>
                      <typ.icon size={12} /> {typ.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Raum</label>
                  <input value={newBlock.raum || ""} onChange={e => setNewBlock({ ...newBlock, raum: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Verantwortlich</label>
                  <input value={newBlock.verantwortlich || ""} onChange={e => setNewBlock({ ...newBlock, verantwortlich: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-dpsg-gray-100 px-5 py-4">
              <button onClick={() => setShowAddModal(false)}
                className="rounded-lg bg-dpsg-gray-100 px-4 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
                Abbrechen
              </button>
              <button onClick={addBlock} disabled={!newBlock.titel || saving}
                className="rounded-lg bg-dpsg-blue px-4 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors disabled:opacity-50">
                {saving ? "Wird angelegt..." : "Hinzufügen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
