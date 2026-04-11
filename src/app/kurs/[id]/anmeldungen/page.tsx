"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Users, Search, Download, Check, X, Clock, AlertTriangle,
  Loader2, Filter, Mail, Phone, Utensils, ChevronDown, ExternalLink,
  Copy, UserCheck
} from "lucide-react";

interface Anmeldung {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
  telefon?: string;
  stamm?: string;
  ernaehrung: string;
  allergien?: string;
  status: string;
  bezahlt: boolean;
  efz_vorhanden: boolean;
  foto_erlaubnis: boolean;
  created_at: string;
  anmerkungen?: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string; icon: any }> = {
  eingegangen: { label: "Eingegangen", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  bestaetigt: { label: "Bestätigt", cls: "bg-green-100 text-green-700 border-green-200", icon: Check },
  warteliste: { label: "Warteliste", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle },
  storniert: { label: "Storniert", cls: "bg-red-100 text-red-700 border-red-200", icon: X },
};

export default function AnmeldungenAdminPage() {
  const params = useParams();
  const kursId = params.id as string;
  const [anmeldungen, setAnmeldungen] = useState<Anmeldung[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("alle");

  useEffect(() => { load(); }, [kursId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/anmeldung/${kursId}/admin`);
      if (res.ok) setAnmeldungen(await res.json());
    } finally {
      setLoading(false);
    }
  }

  const filtered = anmeldungen
    .filter(a => filterStatus === "alle" || a.status === filterStatus)
    .filter(a => !search || `${a.vorname} ${a.nachname} ${a.email} ${a.stamm}`.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    gesamt: anmeldungen.filter(a => a.status !== "storniert").length,
    bestaetigt: anmeldungen.filter(a => a.status === "bestaetigt").length,
    warteliste: anmeldungen.filter(a => a.status === "warteliste").length,
    vegetarisch: anmeldungen.filter(a => a.ernaehrung === "vegetarisch" && a.status !== "storniert").length,
    vegan: anmeldungen.filter(a => a.ernaehrung === "vegan" && a.status !== "storniert").length,
  };

  const anmeldeLink = typeof window !== "undefined" ? `${window.location.origin}/anmeldung/${kursId}` : "";

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-dpsg-blue" />
          <h2 className="text-lg font-bold text-dpsg-gray-900">Anmeldungen</h2>
          <span className="text-xs text-dpsg-gray-400">{stats.gesamt} Teilnehmende</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigator.clipboard.writeText(anmeldeLink)}
            className="flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
            <Copy className="h-3.5 w-3.5" /> Anmeldelink kopieren
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
            <Download className="h-3.5 w-3.5" /> CSV Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: "Gesamt", value: stats.gesamt, color: "text-dpsg-blue" },
          { label: "Bestätigt", value: stats.bestaetigt, color: "text-green-700" },
          { label: "Warteliste", value: stats.warteliste, color: "text-amber-700" },
          { label: "Vegetarisch", value: stats.vegetarisch, color: "text-dpsg-gray-700" },
          { label: "Vegan", value: stats.vegan, color: "text-dpsg-gray-700" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-4 text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-dpsg-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-dpsg-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-dpsg-gray-200 pl-10 pr-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
            placeholder="Name, E-Mail oder Stamm suchen..." />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none">
          <option value="alle">Alle Status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dpsg-gray-100 bg-dpsg-gray-50">
                {["Name", "E-Mail", "Stamm", "Ernährung", "eFZ", "Status", "Bezahlt"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dpsg-gray-50">
              {filtered.map(a => {
                const st = STATUS_MAP[a.status] || STATUS_MAP.eingegangen;
                return (
                  <tr key={a.id} className="hover:bg-dpsg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-dpsg-gray-900">{a.vorname} {a.nachname}</td>
                    <td className="px-4 py-3 text-dpsg-gray-600">{a.email}</td>
                    <td className="px-4 py-3 text-dpsg-gray-600">{a.stamm || "\u2014"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${a.ernaehrung !== "normal" ? "font-bold text-amber-700" : "text-dpsg-gray-500"}`}>
                        {a.ernaehrung}
                      </span>
                      {a.allergien && <span className="text-[10px] text-red-600 ml-1">({a.allergien})</span>}
                    </td>
                    <td className="px-4 py-3">
                      {a.efz_vorhanden ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-dpsg-gray-300" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.bezahlt ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-dpsg-gray-300" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-dpsg-gray-400">
            {anmeldungen.length === 0 ? "Noch keine Anmeldungen. Teile den Anmeldelink!" : "Keine Ergebnisse für diesen Filter."}
          </div>
        )}
      </div>
    </div>
  );
}
