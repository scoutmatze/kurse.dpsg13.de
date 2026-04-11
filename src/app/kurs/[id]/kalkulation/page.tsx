"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Calculator, Plus, Trash2, ChevronDown, ChevronRight, Euro,
  Users, Home, UtensilsCrossed, Bus, Package, FileText, Download,
  PieChart, TrendingUp, AlertTriangle, Check, Moon, Sun, Utensils,
  GraduationCap, Coffee, Building2, Save, Loader2, X
} from "lucide-react";

interface Posten {
  id?: number;
  typ: string;
  kategorie: string;
  bezeichnung: string;
  betrag: number;
  ist_auto: boolean;
  auto_typ?: string | null;
}

interface Kalkulation {
  id: number;
  kurs_id: number;
  ue_pro_nacht: number;
  vp_pro_tag: number;
  tn_beitrag: number;
  auto_calc_beitrag: boolean;
  posten: Posten[];
}

interface Kurs {
  id: number;
  name: string;
  max_teilnehmende: number | null;
  team_vorlauf_tage: number;
  start_datum: string | null;
  end_datum: string | null;
  haus_id: string | null;
  verpflegung: string;
  tn_count: number;
  team_count: number;
}

interface Haus {
  id: number;
  name: string;
  region: string;
  uebernachtung: number;
  vollpension: number;
  halbpension: number;
  selbstversorger: number;
}

const KATEGORIEN = [
  { id: "unterkunft", label: "Unterkunft & Verpflegung", icon: Home, color: "#003056" },
  { id: "material", label: "Material & Ausstattung", icon: Package, color: "#b45309" },
  { id: "reise", label: "Reise & Transport", icon: Bus, color: "#0891b2" },
  { id: "referenten", label: "Referent*innen & Honorare", icon: GraduationCap, color: "#7c3aed" },
  { id: "versicherung", label: "Versicherung & Gebühren", icon: FileText, color: "#8b0a1e" },
  { id: "sonstiges", label: "Sonstiges", icon: Coffee, color: "#5c5850" },
];

const EINNAHMEN_KAT = [
  { id: "tn-beitrag", label: "Teilnahmebeiträge" },
  { id: "zuschuss", label: "Zuschüsse (KJR, BJR, etc.)" },
  { id: "spenden", label: "Spenden" },
  { id: "eigenanteil", label: "Eigenanteil Stamm/DV" },
  { id: "sonstiges-e", label: "Sonstige Einnahmen" },
];

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function uid() {
  return "tmp-" + Math.random().toString(36).slice(2, 9);
}

export default function KalkulationPage() {
  const params = useParams();
  const kursId = params.id as string;

  const [kurs, setKurs] = useState<Kurs | null>(null);
  const [kalk, setKalk] = useState<Kalkulation | null>(null);
  const [haeuser, setHaeuser] = useState<Haus[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Editable state
  const [tn, setTn] = useState(25);
  const [teamende, setTeamende] = useState(6);
  const [naechte, setNaechte] = useState(7);
  const [teamVorlauf, setTeamVorlauf] = useState(1);
  const [hausId, setHausId] = useState("custom");
  const [verpflegung, setVerpflegung] = useState("vp");
  const [manuelleUe, setManuelleUe] = useState(20);
  const [manuelleVp, setManuelleVp] = useState(38);
  const [ausgaben, setAusgaben] = useState<Posten[]>([]);
  const [einnahmen, setEinnahmen] = useState<Posten[]>([]);
  const [autoCalc, setAutoCalc] = useState(true);
  const [manuellerBeitrag, setManuellerBeitrag] = useState(0);
  const [openSections, setOpenSections] = useState({ basis: true, haus: true, ausgaben: true, einnahmen: true });

  // Load data
  useEffect(() => {
    Promise.all([
      fetch(`/api/kurse/${kursId}`).then(r => r.json()),
      fetch(`/api/kalkulation/${kursId}`).then(r => r.json()),
      fetch("/api/haeuser").then(r => r.json()),
    ]).then(([kursData, kalkData, haeuserData]) => {
      setKurs(kursData);
      setKalk(kalkData);
      setHaeuser(haeuserData);

      // Init from kurs data
      setTn(kursData.max_teilnehmende || 25);
      setTeamende(kursData.team_count || 6);
      setTeamVorlauf(kursData.team_vorlauf_tage || 1);
      setVerpflegung(kursData.verpflegung || "vp");

      if (kursData.start_datum && kursData.end_datum) {
        const start = new Date(kursData.start_datum);
        const end = new Date(kursData.end_datum);
        const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        setNaechte(diff > 0 ? diff : 7);
      }

      // Init from kalkulation
      if (kalkData.ue_pro_nacht) setManuelleUe(Number(kalkData.ue_pro_nacht));
      if (kalkData.vp_pro_tag) setManuelleVp(Number(kalkData.vp_pro_tag));
      setAutoCalc(kalkData.auto_calc_beitrag !== false);
      if (kalkData.tn_beitrag) setManuellerBeitrag(Number(kalkData.tn_beitrag));

      // Split posten
      const a = (kalkData.posten || []).filter((p: Posten) => p.typ === "ausgabe");
      const e = (kalkData.posten || []).filter((p: Posten) => p.typ === "einnahme");
      setAusgaben(a);
      setEinnahmen(e);

      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [kursId]);

  // Haus lookup
  const haus = haeuser.find(h => String(h.id) === hausId);
  const isCustom = !haus;
  const ueProNacht = haus ? Number(haus.uebernachtung) : manuelleUe;
  const vpProTag = haus
    ? Number(verpflegung === "vp" ? haus.vollpension : verpflegung === "hp" ? haus.halbpension : verpflegung === "sv" ? haus.selbstversorger : 0)
    : (verpflegung === "keine" ? 0 : manuelleVp);

  const gesamtPersonen = tn + teamende;
  const tnNaechte = tn * naechte;
  const teamNaechte = teamende * (naechte + teamVorlauf);
  const gesamtNaechte = tnNaechte + teamNaechte;
  const tage = naechte + 1;
  const teamTage = naechte + teamVorlauf + 1;

  const kostenUe = gesamtNaechte * ueProNacht;
  const kostenVp = (tn * tage + teamende * teamTage) * vpProTag;

  const berechnetAusgaben = useMemo(() => {
    return ausgaben.map(a => {
      if (a.ist_auto && a.auto_typ === "ue") return { ...a, betrag: kostenUe };
      if (a.ist_auto && a.auto_typ === "vp") return { ...a, betrag: kostenVp };
      return a;
    });
  }, [ausgaben, kostenUe, kostenVp]);

  const summeAusgaben = berechnetAusgaben.reduce((s, a) => s + a.betrag, 0);
  const summeEinnahmenOhneTn = einnahmen.reduce((s, e) => s + e.betrag, 0);
  const berechneterBeitrag = tn > 0 ? Math.ceil((summeAusgaben - summeEinnahmenOhneTn) / tn) : 0;
  const effektiverBeitrag = autoCalc ? berechneterBeitrag : manuellerBeitrag;
  const summeEinnahmen = summeEinnahmenOhneTn + (effektiverBeitrag * tn);
  const saldo = summeEinnahmen - summeAusgaben;
  const proKopf = tn > 0 ? summeAusgaben / tn : 0;

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Update kurs
      await fetch(`/api/kurse/${kursId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_teilnehmende: tn,
          team_vorlauf_tage: teamVorlauf,
          verpflegung,
          haus_id: hausId,
        }),
      });

      // Update kalkulation
      const allPosten = [
        ...berechnetAusgaben.map(a => ({ ...a, typ: "ausgabe" })),
        ...einnahmen.map(e => ({ ...e, typ: "einnahme" })),
      ];

      await fetch(`/api/kalkulation/${kursId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ue_pro_nacht: ueProNacht,
          vp_pro_tag: vpProTag,
          tn_beitrag: effektiverBeitrag,
          auto_calc_beitrag: autoCalc,
          posten: allPosten,
        }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }, [kursId, tn, teamVorlauf, verpflegung, hausId, berechnetAusgaben, einnahmen, ueProNacht, vpProTag, effektiverBeitrag, autoCalc]);

  const toggle = (s: string) => setOpenSections(prev => ({ ...prev, [s]: !prev[s as keyof typeof prev] }));

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calculator className="h-5 w-5 text-dpsg-blue" />
          <h2 className="text-lg font-bold text-dpsg-gray-900">Kalkulation & Budget</h2>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
            <Download className="h-3.5 w-3.5" /> Excel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-dpsg-blue px-4 py-2 text-sm font-bold text-white hover:bg-dpsg-blue-light transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Speichert..." : saved ? "Gespeichert!" : "Speichern"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users, label: "Teilnehmende", value: String(tn), sub: `+ ${teamende} Team = ${gesamtPersonen}` },
          { icon: Moon, label: "Übernachtungen", value: String(gesamtNaechte), sub: `${tnNaechte} TN + ${teamNaechte} Team` },
          { icon: Euro, label: "Kosten / Kopf", value: `${fmt(proKopf)} EUR`, sub: `Gesamt: ${fmt(summeAusgaben)} EUR` },
          { icon: TrendingUp, label: "Saldo", value: `${saldo >= 0 ? "+" : ""}${fmt(saldo)} EUR`, sub: saldo >= 0 ? "Im Plus" : "Unterdeckung!" },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="h-4 w-4 text-dpsg-blue" />
              <span className="text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">{card.label}</span>
            </div>
            <div className="text-xl font-bold text-dpsg-gray-900">{card.value}</div>
            <div className="text-xs text-dpsg-gray-500 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-5">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Basisdaten */}
          <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm">
            <button onClick={() => toggle("basis")}
              className="w-full flex items-center gap-2 border-b border-dpsg-gray-100 bg-dpsg-gray-50 px-5 py-3 rounded-t-xl">
              {openSections.basis ? <ChevronDown className="h-4 w-4 text-dpsg-gray-400" /> : <ChevronRight className="h-4 w-4 text-dpsg-gray-400" />}
              <Users className="h-4 w-4 text-dpsg-blue" />
              <span className="text-sm font-bold text-dpsg-gray-900">Basisdaten</span>
            </button>
            {openSections.basis && (
              <div className="p-5 grid grid-cols-4 gap-4">
                {[
                  { label: "Teilnehmende", value: tn, set: setTn },
                  { label: "Teamende", value: teamende, set: setTeamende },
                  { label: "Nächte (Kurs)", value: naechte, set: setNaechte },
                  { label: "Team-Vorlauf (Nächte)", value: teamVorlauf, set: setTeamVorlauf },
                ].map(field => (
                  <div key={field.label}>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">{field.label}</label>
                    <input type="number" value={field.value} onChange={e => field.set(Number(e.target.value) || 0)} min={0}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unterkunft */}
          <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm">
            <button onClick={() => toggle("haus")}
              className="w-full flex items-center gap-2 border-b border-dpsg-gray-100 bg-dpsg-gray-50 px-5 py-3 rounded-t-xl">
              {openSections.haus ? <ChevronDown className="h-4 w-4 text-dpsg-gray-400" /> : <ChevronRight className="h-4 w-4 text-dpsg-gray-400" />}
              <Building2 className="h-4 w-4 text-dpsg-blue" />
              <span className="text-sm font-bold text-dpsg-gray-900">Unterkunft & Verpflegung</span>
            </button>
            {openSections.haus && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">Haus</label>
                  <select value={hausId} onChange={e => setHausId(e.target.value)}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20">
                    <option value="custom">Manuell eingeben</option>
                    {haeuser.map(h => (
                      <option key={h.id} value={String(h.id)}>
                        {h.name} ({h.region}) — ÜN {h.uebernachtung}EUR / VP {h.vollpension}EUR
                      </option>
                    ))}
                  </select>
                </div>

                {isCustom && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-dpsg-gray-400">ÜN-Preis / Nacht / Person</label>
                      <input type="number" value={manuelleUe} onChange={e => setManuelleUe(Number(e.target.value) || 0)} min={0}
                        className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-dpsg-gray-400">VP-Preis / Tag / Person</label>
                      <input type="number" value={manuelleVp} onChange={e => setManuelleVp(Number(e.target.value) || 0)} min={0}
                        className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">Verpflegungsart</label>
                  <div className="flex gap-2">
                    {[
                      { id: "vp", label: "Vollpension", Icon: Utensils },
                      { id: "hp", label: "Halbpension", Icon: Sun },
                      { id: "sv", label: "Selbstversorger", Icon: UtensilsCrossed },
                      { id: "keine", label: "Keine", Icon: X },
                    ].map(v => (
                      <button key={v.id} onClick={() => setVerpflegung(v.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                          verpflegung === v.id
                            ? "border-dpsg-blue bg-dpsg-blue/10 text-dpsg-blue"
                            : "border-dpsg-gray-200 text-dpsg-gray-600 hover:bg-dpsg-gray-50"
                        }`}>
                        <v.Icon className="h-3.5 w-3.5" /> {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-dpsg-gray-50 p-3 flex justify-between text-xs text-dpsg-gray-600">
                  <span>Unterkunft: {gesamtNaechte} x {ueProNacht}EUR = <strong>{fmt(kostenUe)} EUR</strong></span>
                  <span>Verpflegung: {tn * tage + teamende * teamTage} x {vpProTag}EUR = <strong>{fmt(kostenVp)} EUR</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Ausgaben */}
          <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-dpsg-gray-100 bg-dpsg-gray-50 px-5 py-3 rounded-t-xl">
              <button onClick={() => toggle("ausgaben")} className="flex items-center gap-2">
                {openSections.ausgaben ? <ChevronDown className="h-4 w-4 text-dpsg-gray-400" /> : <ChevronRight className="h-4 w-4 text-dpsg-gray-400" />}
                <TrendingUp className="h-4 w-4 text-dpsg-blue" />
                <span className="text-sm font-bold text-dpsg-gray-900">Ausgaben — {fmt(summeAusgaben)} EUR</span>
              </button>
              <button onClick={() => setAusgaben([...ausgaben, { typ: "ausgabe", kategorie: "sonstiges", bezeichnung: "", betrag: 0, ist_auto: false }])}
                className="flex items-center gap-1 rounded-lg bg-dpsg-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors">
                <Plus className="h-3.5 w-3.5" /> Position
              </button>
            </div>
            {openSections.ausgaben && (
              <div>
                <div className="grid grid-cols-[1fr_200px_100px_32px] gap-2 px-5 py-2 border-b border-dpsg-gray-100">
                  {["Bezeichnung", "Kategorie", "Betrag", ""].map(h => (
                    <span key={h} className="text-[10px] font-semibold uppercase tracking-wide text-dpsg-gray-400">{h}</span>
                  ))}
                </div>
                {berechnetAusgaben.map((a, i) => (
                  <div key={i} className="grid grid-cols-[1fr_200px_100px_32px] gap-2 items-center px-5 py-2 border-b border-dpsg-gray-50 hover:bg-dpsg-gray-50 transition-colors">
                    <div className="flex items-center gap-2">
                      {a.ist_auto ? (
                        <span className="text-sm text-dpsg-gray-600">{a.bezeichnung} <span className="text-xs text-dpsg-gray-400">(auto)</span></span>
                      ) : (
                        <input value={a.bezeichnung} onChange={e => { const n = [...ausgaben]; n[i] = { ...n[i], bezeichnung: e.target.value }; setAusgaben(n); }}
                          className="w-full border-none bg-transparent text-sm focus:outline-none" placeholder="Bezeichnung" />
                      )}
                    </div>
                    <select value={a.kategorie} onChange={e => { const n = [...ausgaben]; n[i] = { ...n[i], kategorie: e.target.value }; setAusgaben(n); }}
                      className="rounded border border-dpsg-gray-200 px-2 py-1 text-xs text-dpsg-gray-700">
                      {KATEGORIEN.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                    </select>
                    {a.ist_auto ? (
                      <span className="text-right text-sm font-bold text-dpsg-gray-900">{fmt(a.betrag)}</span>
                    ) : (
                      <input type="number" value={a.betrag} onChange={e => { const n = [...ausgaben]; n[i] = { ...n[i], betrag: Number(e.target.value) || 0 }; setAusgaben(n); }}
                        className="w-full rounded border border-dpsg-gray-200 px-2 py-1 text-right text-sm font-bold focus:border-dpsg-blue focus:outline-none" min={0} />
                    )}
                    <div>
                      {!a.ist_auto && (
                        <button onClick={() => setAusgaben(ausgaben.filter((_, j) => j !== i))}
                          className="text-dpsg-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="px-5 py-3 text-right border-t border-dpsg-gray-100">
                  <span className="text-sm font-bold text-dpsg-gray-900">Summe: {fmt(summeAusgaben)} EUR</span>
                </div>
              </div>
            )}
          </div>

          {/* Einnahmen */}
          <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-dpsg-gray-100 bg-dpsg-gray-50 px-5 py-3 rounded-t-xl">
              <button onClick={() => toggle("einnahmen")} className="flex items-center gap-2">
                {openSections.einnahmen ? <ChevronDown className="h-4 w-4 text-dpsg-gray-400" /> : <ChevronRight className="h-4 w-4 text-dpsg-gray-400" />}
                <Euro className="h-4 w-4 text-dpsg-blue" />
                <span className="text-sm font-bold text-dpsg-gray-900">Einnahmen — {fmt(summeEinnahmen)} EUR</span>
              </button>
              <button onClick={() => setEinnahmen([...einnahmen, { typ: "einnahme", kategorie: "sonstiges-e", bezeichnung: "", betrag: 0, ist_auto: false }])}
                className="flex items-center gap-1 rounded-lg bg-dpsg-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors">
                <Plus className="h-3.5 w-3.5" /> Einnahme
              </button>
            </div>
            {openSections.einnahmen && (
              <div>
                {/* TN-Beitrag */}
                <div className="px-5 py-4 border-b border-dpsg-gray-100 bg-dpsg-blue/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-dpsg-blue" />
                      <span className="text-sm font-bold text-dpsg-gray-900">Teilnahmebeitrag</span>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-dpsg-gray-600 cursor-pointer">
                      <input type="checkbox" checked={autoCalc} onChange={e => { setAutoCalc(e.target.checked); if (!e.target.checked) setManuellerBeitrag(berechneterBeitrag); }}
                        className="accent-dpsg-blue" />
                      Auto-Berechnung
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dpsg-gray-500">
                      ({fmt(summeAusgaben)} - {fmt(summeEinnahmenOhneTn)}) / {tn} TN
                    </span>
                    <div className="flex items-center gap-2">
                      {autoCalc ? (
                        <span className="text-xl font-bold text-dpsg-blue">{fmt(effektiverBeitrag)} EUR</span>
                      ) : (
                        <input type="number" value={manuellerBeitrag} onChange={e => setManuellerBeitrag(Number(e.target.value) || 0)}
                          className="w-24 rounded-lg border border-dpsg-gray-200 px-2 py-1 text-right text-lg font-bold focus:border-dpsg-blue focus:outline-none" min={0} />
                      )}
                      <span className="text-xs text-dpsg-gray-500">/ Person</span>
                    </div>
                  </div>
                  <div className="text-xs text-dpsg-gray-500 mt-1 text-right">
                    = {tn} TN x {fmt(effektiverBeitrag)} = <strong>{fmt(effektiverBeitrag * tn)} EUR</strong>
                  </div>
                </div>

                {einnahmen.map((e, i) => (
                  <div key={i} className="grid grid-cols-[1fr_200px_100px_32px] gap-2 items-center px-5 py-2 border-b border-dpsg-gray-50">
                    <input value={e.bezeichnung} onChange={ev => { const n = [...einnahmen]; n[i] = { ...n[i], bezeichnung: ev.target.value }; setEinnahmen(n); }}
                      className="w-full border-none bg-transparent text-sm focus:outline-none" placeholder="Bezeichnung" />
                    <select value={e.kategorie} onChange={ev => { const n = [...einnahmen]; n[i] = { ...n[i], kategorie: ev.target.value }; setEinnahmen(n); }}
                      className="rounded border border-dpsg-gray-200 px-2 py-1 text-xs text-dpsg-gray-700">
                      {EINNAHMEN_KAT.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                    </select>
                    <input type="number" value={e.betrag} onChange={ev => { const n = [...einnahmen]; n[i] = { ...n[i], betrag: Number(ev.target.value) || 0 }; setEinnahmen(n); }}
                      className="w-full rounded border border-dpsg-gray-200 px-2 py-1 text-right text-sm font-bold focus:border-dpsg-blue focus:outline-none" min={0} />
                    <button onClick={() => setEinnahmen(einnahmen.filter((_, j) => j !== i))}
                      className="text-dpsg-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="px-5 py-3 text-right border-t border-dpsg-gray-100">
                  <span className="text-sm font-bold text-dpsg-gray-900">Summe: {fmt(summeEinnahmen)} EUR</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Summary */}
        <div className="space-y-5">
          <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm sticky top-4">
            <div className="border-b border-dpsg-gray-100 bg-dpsg-gray-50 px-5 py-3 rounded-t-xl flex items-center gap-2">
              <PieChart className="h-4 w-4 text-dpsg-blue" />
              <span className="text-sm font-bold">Zusammenfassung</span>
            </div>

            <div className="p-5 space-y-3">
              {KATEGORIEN.map(k => {
                const sum = berechnetAusgaben.filter(a => a.kategorie === k.id).reduce((s, a) => s + a.betrag, 0);
                if (sum === 0) return null;
                const pct = summeAusgaben > 0 ? (sum / summeAusgaben) * 100 : 0;
                return (
                  <div key={k.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-dpsg-gray-600">{k.label}</span>
                      <span className="font-bold text-dpsg-gray-900">{fmt(sum)} EUR</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-dpsg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: k.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dpsg-gray-100 p-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-dpsg-gray-600">Ausgaben</span>
                <span className="font-bold text-dpsg-red">{fmt(summeAusgaben)} EUR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dpsg-gray-600">Einnahmen</span>
                <span className="font-bold text-green-700">{fmt(summeEinnahmen)} EUR</span>
              </div>
              <div className="h-px bg-dpsg-gray-200 my-2" />
              <div className="flex justify-between text-base">
                <span className="font-bold">Saldo</span>
                <span className={`font-bold ${saldo >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {saldo >= 0 ? "+" : ""}{fmt(saldo)} EUR
                </span>
              </div>

              {saldo < 0 && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 flex items-center gap-2 text-xs text-red-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  Unterdeckung! TN-Beitrag erhöhen oder Zuschüsse einwerben.
                </div>
              )}
              {saldo >= 0 && saldo < summeAusgaben * 0.05 && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2 text-xs text-amber-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  Knapp kalkuliert. Mind. 5% Puffer empfohlen.
                </div>
              )}
              {saldo > 0 && saldo >= summeAusgaben * 0.05 && (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-2 text-xs text-green-700">
                  <Check className="h-4 w-4 flex-shrink-0" />
                  Ausgeglichen mit ausreichend Puffer.
                </div>
              )}
            </div>

            <div className="border-t border-dpsg-gray-100 p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400 mb-2">Empfohlener TN-Beitrag</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-dpsg-blue">{fmt(effektiverBeitrag)}</span>
                <span className="text-sm text-dpsg-gray-500">EUR / Person</span>
              </div>
              <div className="text-xs text-dpsg-gray-500 mt-1">
                Tagesrate: {fmt(effektiverBeitrag / Math.max(tage, 1))} EUR / Tag
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
