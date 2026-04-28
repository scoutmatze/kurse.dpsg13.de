"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Shield, Calendar, MapPin, Check, Clock, Users, Car,
  Plus, X, Loader2, ChevronRight, AlertTriangle, Utensils,
  BookOpen, Coffee, Music
} from "lucide-react";

interface PortalData {
  anmeldung: {
    vorname: string;
    nachname: string;
    email: string;
    status: string;
    ernaehrung: string;
  };
  kurs: {
    id: number;
    name: string;
    start_datum: string;
    end_datum: string;
    ort: string;
    beschreibung?: string;
  };
  programm: Array<{
    tag_nummer: number;
    tag_titel: string;
    start_zeit: string;
    end_zeit: string;
    titel: string;
    typ: string;
    raum?: string;
  }>;
  fahrgemeinschaften: Array<{
    id: number;
    richtung: string;
    abfahrtsort: string;
    abfahrtszeit?: string;
    plaetze_gesamt: number;
    belegte_plaetze: number;
    kontakt_name?: string;
    kontakt_telefon?: string;
    beschreibung?: string;
  }>;
}

const BLOCK_COLORS: Record<string, string> = {
  programm: "#003056", workshop: "#7c3aed", plenum: "#0891b2",
  pause: "#9e9a92", essen: "#b45309", freizeit: "#15803d", orga: "#8b0a1e",
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  eingegangen: { label: "Eingegangen", cls: "bg-blue-100 text-blue-700" },
  bestaetigt: { label: "Bestätigt", cls: "bg-green-100 text-green-700" },
  warteliste: { label: "Warteliste", cls: "bg-amber-100 text-amber-700" },
};

export default function TeilnehmerPortal() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [showFgAdd, setShowFgAdd] = useState(false);
  const [packliste, setPackliste] = useState<Array<{id: number; titel: string; kategorie: string; pflicht: boolean}>>([]);
  const [newFg, setNewFg] = useState({
    richtung: "hin", abfahrtsort: "", plaetze_gesamt: 4, kontakt_name: "", kontakt_telefon: "",
  });

  useEffect(() => {
    fetch(`/api/tn-portal/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error); }))
      .then(d => {
        setData(d);
        fetch("/api/packliste/" + d.kurs.id).then(r => r.ok ? r.json() : []).then(setPackliste).catch(() => {});
      }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  }

  async function createFahrgemeinschaft() {
    if (!data || !newFg.abfahrtsort) return;
    await fetch(`/api/fahrgemeinschaften/${data.kurs.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...newFg, kontakt_name: newFg.kontakt_name || `${data.anmeldung.vorname} ${data.anmeldung.nachname}` }),
    });
    // Reload
    const res = await fetch(`/api/tn-portal/${token}`);
    if (res.ok) setData(await res.json());
    setShowFgAdd(false);
  }

  if (loading) {
    return <div className="min-h-screen bg-dpsg-beige-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-dpsg-blue" /></div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-dpsg-beige-50 flex items-center justify-center px-4">
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-8 text-center max-w-sm">
          <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-dpsg-gray-900">Link ungültig</h1>
          <p className="text-sm text-dpsg-gray-500 mt-2">{error || "Dieser Link ist ungültig oder abgelaufen."}</p>
        </div>
      </div>
    );
  }

  const { anmeldung, kurs, programm, fahrgemeinschaften } = data;
  const tage = [...new Set(programm.map(p => p.tag_nummer))].sort();
  const st = STATUS_MAP[anmeldung.status] || STATUS_MAP.eingegangen;

  return (
    <div className="min-h-screen bg-dpsg-beige-50">
      {/* Hero */}
      <div className="bg-dpsg-blue text-white">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 mb-3">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold">{kurs.name}</h1>
          <div className="flex items-center justify-center gap-3 text-sm text-white/70 mt-2">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {kurs.ort}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(kurs.start_datum)} \u2013 {formatDate(kurs.end_datum)}</span>
          </div>
          <div className="mt-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${st.cls}`}>{st.label}</span>
          </div>
        </div>
        <div className="h-[3px] bg-dpsg-red" />
      </div>

      {/* Greeting */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-5 mb-4">
          <h2 className="text-base font-bold text-dpsg-gray-900">Hallo {anmeldung.vorname}!</h2>
          <p className="text-sm text-dpsg-gray-500 mt-1">
            Hier findest du alle Infos zu deinem Kurs. Diese Seite wird aktualisiert, sobald es Neuigkeiten gibt.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {[
            { id: "info", label: "Infos" },
            { id: "programm", label: "Programm" },
            { id: "fahrgemeinschaften", label: "Fahrgemeinschaften" },
            { id: "packliste", label: "Packliste" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === tab.id ? "bg-dpsg-blue text-white" : "bg-white border border-dpsg-gray-200 text-dpsg-gray-600"
              }`}>{tab.label}</button>
          ))}
        </div>

        {activeTab === "info" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-5">
              <h3 className="text-sm font-bold text-dpsg-gray-900 mb-3">Deine Anmeldung</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-dpsg-gray-400">Name</span><div className="font-bold">{anmeldung.vorname} {anmeldung.nachname}</div></div>
                <div><span className="text-dpsg-gray-400">E-Mail</span><div className="font-bold">{anmeldung.email}</div></div>
                <div><span className="text-dpsg-gray-400">Ernährung</span><div className="font-bold">{anmeldung.ernaehrung}</div></div>
                <div><span className="text-dpsg-gray-400">Status</span><div><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span></div></div>
              </div>
            </div>
            {kurs.beschreibung && (
              <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-5">
                <h3 className="text-sm font-bold text-dpsg-gray-900 mb-2">Über den Kurs</h3>
                <p className="text-sm text-dpsg-gray-600">{kurs.beschreibung}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "programm" && (
          <div className="space-y-3">
            {tage.length === 0 ? (
              <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-8 text-center">
                <Calendar className="h-8 w-8 text-dpsg-gray-200 mx-auto mb-2" />
                <p className="text-sm text-dpsg-gray-400">Das Programm wird noch geplant.</p>
              </div>
            ) : tage.map(tagNr => {
              const blocks = programm.filter(p => p.tag_nummer === tagNr).sort((a, b) => a.start_zeit.localeCompare(b.start_zeit));
              const tagTitel = blocks[0]?.tag_titel || `Tag ${tagNr}`;
              return (
                <div key={tagNr} className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="bg-dpsg-gray-50 px-4 py-2 border-b border-dpsg-gray-100">
                    <span className="text-xs font-bold text-dpsg-gray-900">Tag {tagNr}: {tagTitel}</span>
                  </div>
                  <div className="divide-y divide-dpsg-gray-50">
                    {blocks.map((b, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2">
                        <span className="text-[10px] font-mono text-dpsg-gray-400 w-12">{b.start_zeit?.slice(0, 5)}</span>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: BLOCK_COLORS[b.typ] || "#9e9a92" }} />
                        <span className="text-xs text-dpsg-gray-800 flex-1">{b.titel}</span>
                        {b.raum && <span className="text-[10px] text-dpsg-gray-400">{b.raum}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "fahrgemeinschaften" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowFgAdd(true)}
                className="flex items-center gap-1.5 rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors">
                <Plus className="h-3.5 w-3.5" /> Fahrgemeinschaft anbieten
              </button>
            </div>

            {fahrgemeinschaften.length === 0 ? (
              <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-8 text-center">
                <Car className="h-8 w-8 text-dpsg-gray-200 mx-auto mb-2" />
                <p className="text-sm text-dpsg-gray-400">Noch keine Fahrgemeinschaften. Biete eine an!</p>
              </div>
            ) : fahrgemeinschaften.map(fg => (
              <div key={fg.id} className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-dpsg-blue" />
                    <span className="text-sm font-bold text-dpsg-gray-900">{fg.abfahrtsort}</span>
                  </div>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-dpsg-gray-100 text-dpsg-gray-600">
                    {fg.richtung === "hin" ? "Hinfahrt" : fg.richtung === "rueck" ? "Rückfahrt" : "Hin + Rück"}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-dpsg-gray-500">
                  <span><Users className="inline h-3 w-3 mr-1" />{fg.belegte_plaetze}/{fg.plaetze_gesamt} Plätze</span>
                  {fg.kontakt_name && <span>{fg.kontakt_name}</span>}
                  {fg.kontakt_telefon && <span>{fg.kontakt_telefon}</span>}
                </div>
                {fg.belegte_plaetze < fg.plaetze_gesamt && (
                  <button className="mt-2 text-xs font-bold text-dpsg-blue hover:underline">Mitfahren anfragen</button>
                )}
              </div>
            ))}

            {showFgAdd && (
              <div className="rounded-xl border border-dpsg-blue bg-dpsg-blue/5 p-4 space-y-3">
                <h4 className="text-sm font-bold text-dpsg-gray-900">Fahrgemeinschaft anbieten</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Abfahrtsort *</label>
                    <input value={newFg.abfahrtsort} onChange={e => setNewFg({ ...newFg, abfahrtsort: e.target.value })}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-1.5 text-sm focus:border-dpsg-blue focus:outline-none" placeholder="z.B. München Hbf" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Freie Plätze</label>
                    <input type="number" value={newFg.plaetze_gesamt} onChange={e => setNewFg({ ...newFg, plaetze_gesamt: Number(e.target.value) || 1 })}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-1.5 text-sm focus:border-dpsg-blue focus:outline-none" min={1} />
                  </div>
                </div>
                <div className="flex gap-2">
                  {[{ id: "hin", l: "Hinfahrt" }, { id: "rueck", l: "Rückfahrt" }, { id: "beides", l: "Hin + Rück" }].map(r => (
                    <button key={r.id} onClick={() => setNewFg({ ...newFg, richtung: r.id })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        newFg.richtung === r.id ? "border-dpsg-blue bg-dpsg-blue/10 text-dpsg-blue" : "border-dpsg-gray-200 text-dpsg-gray-600"
                      }`}>{r.l}</button>
                  ))}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Telefon (für Kontakt)</label>
                  <input value={newFg.kontakt_telefon} onChange={e => setNewFg({ ...newFg, kontakt_telefon: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-1.5 text-sm focus:border-dpsg-blue focus:outline-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowFgAdd(false)}
                    className="rounded-lg bg-dpsg-gray-100 px-3 py-1.5 text-xs font-bold text-dpsg-gray-700">Abbrechen</button>
                  <button onClick={createFahrgemeinschaft} disabled={!newFg.abfahrtsort}
                    className="rounded-lg bg-dpsg-blue px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Anbieten</button>
                </div>
              </div>
            )}
          </div>
        )}

                {activeTab === "packliste" && (
          <div className="space-y-3">
            {packliste.length === 0 ? (
              <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-8 text-center">
                <p className="text-sm text-dpsg-gray-400">Noch keine Packliste vorhanden.</p>
              </div>
            ) : (
              (() => {
                const kats = [...new Set(packliste.map(i => i.kategorie))].sort();
                return kats.map(kat => (
                  <div key={kat} className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="bg-dpsg-gray-50 px-4 py-2 border-b border-dpsg-gray-100">
                      <span className="text-xs font-bold text-dpsg-gray-900">{kat}</span>
                    </div>
                    <div className="divide-y divide-dpsg-gray-50">
                      {packliste.filter(i => i.kategorie === kat).map(item => (
                        <div key={item.id} className="flex items-center gap-2 px-4 py-2">
                          <span className="text-sm text-dpsg-gray-800">{item.titel}</span>
                          {item.pflicht && <span className="text-[10px] font-bold text-dpsg-blue">Pflicht</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        )}

        <p className="text-xs text-center text-dpsg-gray-400 mt-8">Deutsche Pfadfinder*innenschaft Sankt Georg &middot; Gut Pfad!</p>
      </div>
    </div>
  );
}
