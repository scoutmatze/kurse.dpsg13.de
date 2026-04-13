"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Calculator, Calendar, Users, ClipboardList, UserPlus,
  FolderOpen, ArrowLeft, Shield, Settings, ChevronRight, Layers,
  UtensilsCrossed, Building2, Package,
} from "lucide-react";

const TABS = [
  { id: "kalkulation", label: "Kalkulation", icon: Calculator, href: "/kalkulation" },
  { id: "varianten", label: "Varianten", icon: Layers, href: "/varianten" },
  { id: "programm", label: "Tagesplan", icon: Calendar, href: "/programm" },
  { id: "raeume", label: "Räume", icon: Building2, href: "/raeume" },
  { id: "anmeldungen", label: "Anmeldungen", icon: Users, href: "/anmeldungen" },
  { id: "kueche", label: "Küche", icon: UtensilsCrossed, href: "/kueche" },
  { id: "aufgaben", label: "Aufgaben", icon: ClipboardList, href: "/aufgaben" },
  { id: "team", label: "Team", icon: UserPlus, href: "/team" },
  { id: "dateien", label: "Dateien", icon: FolderOpen, href: "/dateien" },
  { id: "packliste", label: "Packliste", icon: Package, href: "/packliste" },
  { id: "einstellungen", label: "Einstellungen", icon: Settings, href: "/einstellungen" },
];

interface KursInfo {
  id: number;
  name: string;
  status: string;
  start_datum: string | null;
  end_datum: string | null;
  ort: string | null;
}

export default function KursLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const [kurs, setKurs] = useState<KursInfo | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
    planung: { label: 'Planung', cls: 'bg-amber-100 text-amber-700' },
    ausgeschrieben: { label: 'Ausgeschrieben', cls: 'bg-green-100 text-green-700' },
    laufend: { label: 'Laufend', cls: 'bg-blue-100 text-blue-700' },
    abgeschlossen: { label: 'Abgeschlossen', cls: 'bg-dpsg-gray-100 text-dpsg-gray-600' },
    archiviert: { label: 'Archiviert', cls: 'bg-dpsg-gray-100 text-dpsg-gray-500' },
  };

  const STATUS_OPTIONS: Record<string, Array<{ next: string; label: string; color: string }>> = {
    planung: [
      { next: "ausgeschrieben", label: "Ausschreiben", color: "bg-green-600 hover:bg-green-700" },
    ],
    ausgeschrieben: [
      { next: "laufend", label: "Kurs starten", color: "bg-dpsg-cyan" },
      { next: "planung", label: "Zurück zu Planung", color: "bg-dpsg-gray-500" },
    ],
    laufend: [
      { next: "abgeschlossen", label: "Abschließen", color: "bg-dpsg-blue" },
      { next: "ausgeschrieben", label: "Zurück zu Ausgeschrieben", color: "bg-dpsg-gray-500" },
    ],
    abgeschlossen: [
      { next: "archiviert", label: "Archivieren", color: "bg-dpsg-gray-600" },
      { next: "laufend", label: "Wieder öffnen", color: "bg-dpsg-gray-500" },
    ],
    archiviert: [
      { next: "abgeschlossen", label: "Wiederherstellen", color: "bg-dpsg-gray-500" },
    ],
  };

  const [showStatusMenu, setShowStatusMenu] = useState(false);

  async function changeStatus(newStatus: string) {
    if (!kurs) return;
    setShowStatusMenu(false);
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/kurse/${params.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setKurs({ ...kurs, status: newStatus });
      } else {
        const err = await res.json();
        alert(err.error || "Statuswechsel fehlgeschlagen");
      }
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    fetch(`/api/kurse/${params.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(setKurs)
      .catch(() => {});
  }, [params.id]);

  const activeTab = TABS.find(t => pathname.endsWith(t.href))?.id || "kalkulation";

  return (
    <div className="min-h-screen bg-dpsg-beige-50">
      {/* Top Bar */}
      <div className="bg-dpsg-blue text-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="h-3 w-3" /> Kurse
            </button>
          </div>
          <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{kurs?.name || "Kurs laden..."}</h1>
              {kurs && STATUS_BADGES[kurs.status] && (
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGES[kurs.status].cls}`}>
                  {STATUS_BADGES[kurs.status].label}
                </span>
              )}
            </div>
          {kurs && (
            <>
              {STATUS_OPTIONS[kurs.status] && STATUS_OPTIONS[kurs.status].length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    disabled={statusLoading}
                    className={`px-3 py-1 rounded-lg text-xs font-bold text-white transition-colors ${STATUS_OPTIONS[kurs.status][0].color} disabled:opacity-50`}
                  >
                    {statusLoading ? "..." : STATUS_OPTIONS[kurs.status][0].label}
                  </button>
                  {showStatusMenu && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-dpsg-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[200px]">
                      {STATUS_OPTIONS[kurs.status].map((opt: any) => (
                        <button key={opt.next} onClick={() => changeStatus(opt.next)}
                          className="w-full text-left px-3 py-2 text-xs text-dpsg-gray-700 hover:bg-dpsg-gray-50">
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="text-xs text-white/60 mt-1">
                {kurs.ort || "Ort offen"} &middot; {kurs.start_datum ? new Date(kurs.start_datum).toLocaleDateString("de-DE") : "Datum offen"}
              </div>
            </>
          )}
        </div>
        <div className="h-[3px] bg-dpsg-red" />

        {/* Tabs */}
        <div className="bg-white border-b border-dpsg-gray-200">
          <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id}
                  onClick={() => router.push(`/kurs/${params.id}${tab.href}`)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? "border-dpsg-blue text-dpsg-blue"
                      : "border-transparent text-dpsg-gray-500 hover:text-dpsg-gray-700 hover:border-dpsg-gray-300"
                  }`}>
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {children}
      </div>

      <p className="text-xs text-center text-dpsg-gray-400 pb-8">
        Deutsche Pfadfinder*innenschaft Sankt Georg &middot; Gut Pfad!
      </p>
    </div>
  );
}
