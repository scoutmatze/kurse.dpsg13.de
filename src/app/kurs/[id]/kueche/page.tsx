"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  UtensilsCrossed, Loader2, AlertTriangle, Users,
  Leaf, Egg, Fish, Wheat
} from "lucide-react";

interface ErnaehrungStat {
  ernaehrung: string;
  anzahl: number;
}

interface AllergiePerson {
  vorname?: string;
  nachname?: string;
  allergien?: string;
  unvertraeglichkeiten?: string;
  anmerkungen?: string;
}

const ERNAEHRUNG_ICONS: Record<string, { icon: any; color: string; label: string }> = {
  normal: { icon: UtensilsCrossed, color: "#5c5850", label: "Alles" },
  vegetarisch: { icon: Leaf, color: "#15803d", label: "Vegetarisch" },
  vegan: { icon: Leaf, color: "#059669", label: "Vegan" },
  halal: { icon: UtensilsCrossed, color: "#7c3aed", label: "Halal" },
  koscher: { icon: UtensilsCrossed, color: "#b45309", label: "Koscher" },
  laktosefrei: { icon: Egg, color: "#0891b2", label: "Laktosefrei" },
  glutenfrei: { icon: Wheat, color: "#dc2626", label: "Glutenfrei" },
};

export default function KuechePage() {
  const params = useParams();
  const kursId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/kueche/${kursId}`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [kursId]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-12 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-dpsg-gray-700">Kein Zugriff</h3>
        <p className="text-sm text-dpsg-gray-500">Du hast keine Berechtigung, die Küchendaten einzusehen.</p>
      </div>
    );
  }

  const gesamt = data.full ? data.anmeldungen.length : data.gesamt;
  const stats: ErnaehrungStat[] = data.full
    ? Object.entries(
        data.anmeldungen.reduce((acc: Record<string, number>, a: any) => {
          acc[a.ernaehrung] = (acc[a.ernaehrung] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([ernaehrung, anzahl]) => ({ ernaehrung, anzahl: anzahl as number }))
    : data.ernaehrung;

  const allergien = data.full
    ? data.anmeldungen.filter((a: any) => a.allergien || a.unvertraeglichkeiten)
    : data.allergien_liste;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <UtensilsCrossed className="h-5 w-5 text-dpsg-blue" />
        <h2 className="text-lg font-bold text-dpsg-gray-900">Küchen-Dashboard</h2>
        <span className="text-xs text-dpsg-gray-400">{gesamt} Personen</span>
      </div>

      {/* Ernährungs-Übersicht */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.sort((a: ErnaehrungStat, b: ErnaehrungStat) => b.anzahl - a.anzahl).map((s: ErnaehrungStat) => {
          const info = ERNAEHRUNG_ICONS[s.ernaehrung] || ERNAEHRUNG_ICONS.normal;
          const Icon = info.icon;
          const pct = gesamt > 0 ? Math.round((s.anzahl / gesamt) * 100) : 0;
          return (
            <div key={s.ernaehrung} className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" style={{ color: info.color }} />
                <span className="text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">{info.label}</span>
              </div>
              <div className="text-2xl font-bold text-dpsg-gray-900">{s.anzahl}</div>
              <div className="mt-2 h-1.5 rounded-full bg-dpsg-gray-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: info.color }} />
              </div>
              <div className="text-[10px] text-dpsg-gray-400 mt-1">{pct}%</div>
            </div>
          );
        })}
      </div>

      {/* Allergien & Unverträglichkeiten */}
      <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm">
        <div className="border-b border-dpsg-gray-100 bg-dpsg-gray-50 px-5 py-3 rounded-t-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-bold text-dpsg-gray-900">Allergien & Unverträglichkeiten</span>
          <span className="text-xs text-dpsg-gray-400">({allergien.length} Personen)</span>
        </div>
        {allergien.length === 0 ? (
          <div className="p-5 text-sm text-dpsg-gray-400">Keine Allergien oder Unverträglichkeiten gemeldet.</div>
        ) : (
          <div className="divide-y divide-dpsg-gray-50">
            {allergien.map((a: any, i: number) => (
              <div key={i} className="px-5 py-3">
                {data.full && (
                  <div className="text-sm font-bold text-dpsg-gray-900 mb-1">{a.vorname} {a.nachname}</div>
                )}
                {a.allergien && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-semibold">Allergie</span>
                    <span className="text-dpsg-gray-700">{a.allergien}</span>
                  </div>
                )}
                {a.unvertraeglichkeiten && (
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-semibold">Unverträglichkeit</span>
                    <span className="text-dpsg-gray-700">{a.unvertraeglichkeiten}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Druckansicht-Hinweis */}
      <div className="mt-6 rounded-lg bg-dpsg-blue/5 border border-dpsg-blue/20 p-4 text-sm text-dpsg-gray-600">
        <strong>Tipp:</strong> Drucke diese Seite (Strg+P) als Übersicht für die Küche aus.
      </div>
    </div>
  );
}
