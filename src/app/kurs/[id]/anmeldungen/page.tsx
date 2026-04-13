"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Users, Search, Download, Check, X, Clock, AlertTriangle,
  Loader2, FileText, Copy, MoreVertical
} from "lucide-react";

interface Anmeldung {
  id: number; vorname: string; nachname: string; email: string;
  telefon?: string; stamm?: string; ernaehrung: string; allergien?: string;
  status: string; bezahlt: boolean; efz_vorhanden: boolean;
  created_at: string; bundesland?: string; funktion?: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  eingegangen: { label: "Eingegangen", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  bestaetigt: { label: "Bestätigt", cls: "bg-green-100 text-green-700 border-green-200" },
  warteliste: { label: "Warteliste", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  storniert: { label: "Storniert", cls: "bg-red-100 text-red-700 border-red-200" },
};

export default function AnmeldungenAdminPage() {
  const params = useParams();
  const kursId = params.id as string;
  const [anmeldungen, setAnmeldungen] = useState<Anmeldung[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("alle");
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);

  useEffect(() => { load(); }, [kursId]);
  async function load() {
    try {
      const res = await fetch(`/api/anmeldung/${kursId}/admin`);
      if (res.ok) setAnmeldungen(await res.json());
    } finally { setLoading(false); }
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/anmeldung/${kursId}/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActionMenuId(null);
    await load();
  }

  async function toggleBezahlt(id: number, bezahlt: boolean) {
    await fetch(`/api/anmeldung/${kursId}/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bezahlt, bezahlt_am: bezahlt ? new Date().toISOString() : null }),
    });
    await load();
  }

  const filtered = anmeldungen
    .filter(a => filterStatus === "alle" || a.status === filterStatus)
    .filter(a => !search || `${a.vorname} ${a.nachname} ${a.email} ${a.stamm}`.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    gesamt: anmeldungen.filter(a => a.status !== "storniert").length,
    bestaetigt: anmeldungen.filter(a => a.status === "bestaetigt").length,
    eingegangen: anmeldungen.filter(a => a.status === "eingegangen").length,
    warteliste: anmeldungen.filter(a => a.status === "warteliste").length,
    bezahlt: anmeldungen.filter(a => a.bezahlt && a.status !== "storniert").length,
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;

  return (
    <div onClick={() => actionMenuId && setActionMenuId(null)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-dpsg-blue" />
          <h2 className="text-lg font-bold text-dpsg-gray-900">Anmeldungen</h2>
          <span className="text-xs text-dpsg-gray-400">{stats.gesamt} TN</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigator.clipboard.writeText(typeof window !== "undefined" ? window.location.origin + "/anmeldung/" + kursId : "")}
            className="flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200">
            <Copy className="h-3.5 w-3.5" /> Link
          </button>
          <a href={`/api/anmeldung/${kursId}/export`} download
            className="flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200">
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
          <a href={`/api/anmeldung/${kursId}/kjp`} download
            className="flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200">
            <FileText className="h-3.5 w-3.5" /> KJP
          </a>
          <a href={`/api/bescheinigung/${kursId}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200">
            <FileText className="h-3.5 w-3.5" /> Bescheinigungen
          </a>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: "Gesamt", value: stats.gesamt, c: "text-dpsg-blue" },
          { label: "Eingegangen", value: stats.eingegangen, c: "text-blue-700" },
          { label: "Bestätigt", value: stats.bestaetigt, c: "text-green-700" },
          { label: "Warteliste", value: stats.warteliste, c: "text-amber-700" },
          { label: "Bezahlt", value: stats.bezahlt, c: "text-dpsg-gray-700" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-4 text-center">
            <div className={`text-xl font-bold ${s.c}`}>{s.value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-dpsg-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-dpsg-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-dpsg-gray-200 pl-10 pr-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
            placeholder="Suchen..." />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm">
          <option value="alle">Alle</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dpsg-gray-100 bg-dpsg-gray-50">
              {["Name", "E-Mail", "Stamm", "Ernährung", "eFZ", "Status", "Bezahlt", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dpsg-gray-50">
            {filtered.map(a => {
              const st = STATUS_MAP[a.status] || STATUS_MAP.eingegangen;
              return (
                <tr key={a.id} className="hover:bg-dpsg-gray-50">
                  <td className="px-4 py-3 font-bold text-dpsg-gray-900">{a.vorname} {a.nachname}</td>
                  <td className="px-4 py-3 text-dpsg-gray-600">{a.email}</td>
                  <td className="px-4 py-3 text-dpsg-gray-600">{a.stamm || "\u2014"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${a.ernaehrung !== "normal" ? "font-bold text-amber-700" : "text-dpsg-gray-500"}`}>{a.ernaehrung}</span>
                    {a.allergien && <span className="text-[10px] text-red-600 ml-1">({a.allergien})</span>}
                  </td>
                  <td className="px-4 py-3">{a.efz_vorhanden ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-dpsg-gray-300" />}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleBezahlt(a.id, !a.bezahlt)}>
                      {a.bezahlt ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-dpsg-gray-300 hover:text-green-500" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 relative">
                    <button onClick={e => { e.stopPropagation(); setActionMenuId(actionMenuId === a.id ? null : a.id); }}
                      className="text-dpsg-gray-400 hover:text-dpsg-blue"><MoreVertical className="h-4 w-4" /></button>
                    {actionMenuId === a.id && (
                      <div className="absolute right-4 top-10 z-20 bg-white border border-dpsg-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                        {a.status !== "bestaetigt" && <button onClick={() => updateStatus(a.id, "bestaetigt")} className="w-full text-left px-3 py-2 text-xs text-green-700 hover:bg-green-50"><Check className="inline h-3 w-3 mr-1" />Bestätigen</button>}
                        {a.status !== "eingegangen" && a.status !== "storniert" && <button onClick={() => updateStatus(a.id, "eingegangen")} className="w-full text-left px-3 py-2 text-xs text-blue-700 hover:bg-blue-50"><Clock className="inline h-3 w-3 mr-1" />Eingegangen</button>}
                        {a.status !== "warteliste" && <button onClick={() => updateStatus(a.id, "warteliste")} className="w-full text-left px-3 py-2 text-xs text-amber-700 hover:bg-amber-50"><AlertTriangle className="inline h-3 w-3 mr-1" />Warteliste</button>}
                        {a.status !== "storniert" && <button onClick={() => updateStatus(a.id, "storniert")} className="w-full text-left px-3 py-2 text-xs text-red-700 hover:bg-red-50"><X className="inline h-3 w-3 mr-1" />Stornieren</button>}
                        <div className="h-px bg-dpsg-gray-100 my-1" />
                        <a href={`/api/bescheinigung/${kursId}?anmeldungId=${a.id}`} target="_blank" className="block px-3 py-2 text-xs text-dpsg-gray-700 hover:bg-dpsg-gray-50"><FileText className="inline h-3 w-3 mr-1" />Bescheinigung</a>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-dpsg-gray-400">Keine Anmeldungen.</div>}
      </div>
    </div>
  );
}
