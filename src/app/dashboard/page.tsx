"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, LogOut, Calculator, Calendar, Users, ClipboardList,
  Shield, GraduationCap, ChevronRight, Settings, X, Loader2,
  UserPlus
} from "lucide-react";

interface Kurs {
  id: number;
  name: string;
  status: string;
  start_datum: string | null;
  end_datum: string | null;
  ort: string | null;
  tn_count: number;
  ersteller_name: string | null;
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  planung: { label: "Planung", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  ausgeschrieben: { label: "Ausgeschrieben", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  laufend: { label: "Laufend", cls: "bg-green-100 text-green-700 border-green-200" },
  abgeschlossen: { label: "Abgeschlossen", cls: "bg-dpsg-gray-100 text-dpsg-gray-600 border-dpsg-gray-200" },
  archiviert: { label: "Archiviert", cls: "bg-dpsg-gray-100 text-dpsg-gray-500 border-dpsg-gray-200" },
};

const NAV_ITEMS = [
  { label: "Kurse", icon: GraduationCap, href: "/dashboard", active: true },
  { label: "Häuser", icon: Calculator, href: "/dashboard/haeuser" },
  { label: "Benutzer*innen", icon: UserPlus, href: "/dashboard/benutzer" },
];

export default function DashboardPage() {
  const [kurse, setKurse] = useState<Kurs[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newKurs, setNewKurs] = useState({ name: "", ort: "", start_datum: "", end_datum: "", max_teilnehmende: 25 });
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadKurse();
  }, []);

  function loadKurse() {
    fetch("/api/kurse")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setKurse)
      .catch(() => { window.location.href = "/login"; })
      .finally(() => setLoading(false));
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  async function handleCreate() {
    if (!newKurs.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/kurse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newKurs),
      });
      if (res.ok) {
        const kurs = await res.json();
        setShowModal(false);
        setNewKurs({ name: "", ort: "", start_datum: "", end_datum: "", max_teilnehmende: 25 });
        router.push(`/kurs/${kurs.id}/kalkulation`);
      }
    } finally {
      setCreating(false);
    }
  }

  function formatDate(d: string | null) {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <div className="min-h-screen bg-dpsg-beige-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-dpsg-gray-200 flex flex-col min-h-screen">
        <div className="px-5 py-5 border-b border-dpsg-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-dpsg-blue flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-dpsg-blue">Kursmanagement</div>
              <div className="text-xs text-dpsg-gray-400">DPSG</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400 px-2 mb-2">Navigation</div>
          {NAV_ITEMS.map(item => (
            <button key={item.label}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                item.active
                  ? "bg-dpsg-blue/10 text-dpsg-blue font-bold"
                  : "text-dpsg-gray-600 hover:bg-dpsg-gray-50"
              }`}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-dpsg-gray-100">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-dpsg-gray-600 hover:bg-dpsg-gray-50">
            <Settings className="h-4 w-4" /> Einstellungen
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-dpsg-gray-600 hover:bg-dpsg-gray-50">
            <LogOut className="h-4 w-4" /> Abmelden
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dpsg-gray-900">Kurse</h1>
            <p className="text-sm text-dpsg-gray-500">{kurse.length} Kurs{kurse.length !== 1 ? "e" : ""} angelegt</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-dpsg-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-dpsg-blue-light transition-colors">
            <Plus className="h-4 w-4" /> Neuer Kurs
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" />
          </div>
        ) : kurse.length === 0 ? (
          <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-12 text-center">
            <GraduationCap className="h-12 w-12 text-dpsg-gray-200 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-dpsg-gray-700 mb-2">Noch keine Kurse</h2>
            <p className="text-sm text-dpsg-gray-500 mb-6">Lege deinen ersten Kurs an und starte mit der Planung.</p>
            <button onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-dpsg-red px-5 py-2.5 text-sm font-bold text-white hover:bg-dpsg-red-light transition-colors">
              <Plus className="h-4 w-4" /> Ersten Kurs anlegen
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {kurse.map(kurs => {
              const badge = STATUS_BADGES[kurs.status] || STATUS_BADGES.planung;
              return (
                <div key={kurs.id} onClick={() => router.push(`/kurs/${kurs.id}/kalkulation`)}
                  className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-dpsg-blue/10 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-dpsg-blue" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-dpsg-gray-900">{kurs.name}</div>
                        <div className="text-xs text-dpsg-gray-500">
                          {kurs.ort || "Ort offen"} &middot; {formatDate(kurs.start_datum)} \u2014 {formatDate(kurs.end_datum)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-dpsg-gray-400">{kurs.tn_count} TN</span>
                      <ChevronRight className="h-4 w-4 text-dpsg-gray-300" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs mt-12 text-center text-dpsg-gray-400">
          Deutsche Pfadfinder*innenschaft Sankt Georg &middot; Gut Pfad!
        </p>
      </main>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl bg-white shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between border-b border-dpsg-gray-100 px-5 py-4">
              <h2 className="text-base font-bold text-dpsg-gray-900">Neuen Kurs anlegen</h2>
              <button onClick={() => setShowModal(false)} className="text-dpsg-gray-400 hover:text-dpsg-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Kursname *</label>
                <input value={newKurs.name} onChange={e => setNewKurs({ ...newKurs, name: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                  placeholder="z.B. Woodbadge-Kurs Herbst 2026" autoFocus />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Ort</label>
                <input value={newKurs.ort} onChange={e => setNewKurs({ ...newKurs, ort: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                  placeholder="z.B. Burg Schwaneck" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Start</label>
                  <input type="date" value={newKurs.start_datum} onChange={e => setNewKurs({ ...newKurs, start_datum: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Ende</label>
                  <input type="date" value={newKurs.end_datum} onChange={e => setNewKurs({ ...newKurs, end_datum: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Max. Teilnehmende</label>
                <input type="number" value={newKurs.max_teilnehmende} onChange={e => setNewKurs({ ...newKurs, max_teilnehmende: Number(e.target.value) || 25 })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                  min={1} />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-dpsg-gray-100 px-5 py-4">
              <button onClick={() => setShowModal(false)}
                className="rounded-lg bg-dpsg-gray-100 px-4 py-2 text-sm font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
                Abbrechen
              </button>
              <button onClick={handleCreate} disabled={!newKurs.name.trim() || creating}
                className="rounded-lg bg-dpsg-blue px-4 py-2 text-sm font-bold text-white hover:bg-dpsg-blue-light transition-colors disabled:opacity-50">
                {creating ? "Wird angelegt..." : "Kurs anlegen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
