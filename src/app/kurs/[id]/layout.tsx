"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Calculator, Calendar, Users, ClipboardList, UserPlus,
  FolderOpen, ArrowLeft, Shield, Settings, ChevronRight, Layers,
  UtensilsCrossed, Building2
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
          <h1 className="text-xl font-bold">{kurs?.name || "Kurs laden..."}</h1>
          {kurs && (
            <div className="text-xs text-white/60 mt-1">
              {kurs.ort || "Ort offen"} &middot; {kurs.start_datum ? new Date(kurs.start_datum).toLocaleDateString("de-DE") : "Datum offen"}
            </div>
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
