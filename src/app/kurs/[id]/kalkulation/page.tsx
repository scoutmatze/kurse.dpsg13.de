"use client";

import {
  useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Calculator, Plus, Trash2, ChevronDown, ChevronRight, Euro,
  Users, Home, UtensilsCrossed, Bus, Package, FileText, Download,
  PieChart, TrendingUp, AlertTriangle, Check, Moon, Sun, Utensils,
  GraduationCap, Coffee, Building2, Save, Loader2, X, GripVertical, MoreVertical
} from "lucide-react";

interface Posten {
  id?: number;
  typ: string;
  kategorie: string;
  bezeichnung: string;
  betrag: number;
  ist_auto: boolean;
  auto_typ?: string | null;
  phase?: string;
  parent_posten_id?: number | null;
  nummer?: string;
  ist_gruppe?: boolean;
  _localId?: string;
}

const AUSGABEN_PHASEN = [
  { id: "vorbereitung", label: "Vorbereitung", color: "#003056" },
  { id: "kurs", label: "Kurs", color: "#0891b2" },
  { id: "nachbereitung", label: "Nachbereitung", color: "#7c3aed" },
];

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
  const [ausgabenPhase, setAusgabenPhase] = useState("alle");
  const [dragItem, setDragItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());
  const [moveMenuIdx, setMoveMenuIdx] = useState<number | null>(null);

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

      if (kursData.haus_id) setHausId(kursData.haus_id);
      if (kursData.start_datum && kursData.end_datum) {
        const start = new Date(kursData.start_datum);
        const end = new Date(kursData.end_datum);
        const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        setNaechte(diff > 0 ? diff : 7);
      }

      // Init from kalkulation
      setManuelleUe(Number(kalkData.ue_pro_nacht) || 0);
      setManuelleVp(Number(kalkData.vp_pro_tag) || 0);
      setAutoCalc(kalkData.auto_calc_beitrag !== false);
      setManuellerBeitrag(Number(kalkData.tn_beitrag) || 0);

      // Split posten
      const a = (kalkData.posten || []).filter((p: Posten) => p.typ === "ausgabe").map((p: Posten) => ({ ...p, betrag: Number(p.betrag || 0) }));
      const e = (kalkData.posten || []).filter((p: Posten) => p.typ === "einnahme").map((p: Posten) => ({ ...p, betrag: Number(p.betrag || 0) }));
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
  const vpProTag = verpflegung === "keine" ? 0
    : verpflegung === "sv" ? manuelleVp
    : haus ? Number(verpflegung === "vp" ? haus.vollpension : verpflegung === "hp" ? haus.halbpension : 0)
    : manuelleVp;

  const gesamtPersonen = Number(tn) + Number(teamende);
  const tnNaechte = Number(tn) * Number(naechte);
  const teamNaechte = Number(teamende) * (Number(naechte) + Number(teamVorlauf));
  const gesamtNaechte = tnNaechte + teamNaechte;
  const tage = Number(naechte) + 1;
  const teamTage = Number(naechte) + Number(teamVorlauf) + 1;

  const kostenUe = Number(gesamtNaechte) * Number(ueProNacht);
  const kostenVp = (Number(tn) * tage + Number(teamende) * teamTage) * Number(vpProTag);

  const berechnetAusgaben = useMemo(() => {
    return ausgaben.map(a => {
      if (a.ist_auto && a.auto_typ === "ue") return { ...a, betrag: kostenUe };
      if (a.ist_auto && a.auto_typ === "vp") return { ...a, betrag: kostenVp };
      return a;
    });
  }, [ausgaben, kostenUe, kostenVp]);

  const summeAusgaben = berechnetAusgaben.reduce((s, a) => s + Number(a.betrag || 0), 0);
  const summeEinnahmenOhneTn = einnahmen.reduce((s, e) => s + Number(e.betrag || 0), 0);
  const berechneterBeitrag = Number(tn) > 0 ? Math.ceil((summeAusgaben - summeEinnahmenOhneTn) / Number(tn)) : 0;
  const effektiverBeitrag = autoCalc ? berechneterBeitrag : manuellerBeitrag;
  const summeEinnahmen = summeEinnahmenOhneTn + (Number(effektiverBeitrag) * Number(tn));
  const saldo = summeEinnahmen - summeAusgaben;
  const proKopf = Number(tn) > 0 ? summeAusgaben / Number(tn) : 0;

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
        ...berechnetAusgaben.map(a => ({ ...a, typ: "ausgabe", phase: a.phase || "kurs" })),
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

  // Generate local IDs for new items
  function localId() { return "loc-" + Math.random().toString(36).slice(2, 8); }

  // Assign items to groups based on position
  function getGroupedAusgaben() {
    const items = berechnetAusgaben;
    const groups: Array<{ group: Posten | null; items: Posten[]; subtotal: number }> = [];
    let currentGroup: { group: Posten | null; items: Posten[]; subtotal: number } = { group: null, items: [], subtotal: 0 };

    for (const item of items) {
      if (item.ist_gruppe) {
        if (currentGroup.group !== null || currentGroup.items.length > 0) {
          currentGroup.subtotal = currentGroup.items.reduce((s, a) => s + Number(a.betrag || 0), 0);
          groups.push(currentGroup);
        }
        currentGroup = { group: item, items: [], subtotal: 0 };
      } else {
        currentGroup.items.push(item);
      }
    }
    currentGroup.subtotal = currentGroup.items.reduce((s, a) => s + Number(a.betrag || 0), 0);
    groups.push(currentGroup);
    return groups;
  }

  function addGruppe() {
    setAusgaben([...ausgaben, { typ: "ausgabe", kategorie: "sonstiges", bezeichnung: "Neue Gruppe", betrag: 0, ist_auto: false, ist_gruppe: true, phase: ausgabenPhase === "alle" ? "kurs" : ausgabenPhase }]);
  }

  function handleDragStart(idx: number) {
    setDragItem(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverItem(idx);
  }

  function handleDrop(idx: number) {
    if (dragItem === null || dragItem === idx) { setDragItem(null); setDragOverItem(null); return; }
    const items = [...ausgaben];
    const dragged = items.splice(dragItem, 1)[0];
    items.splice(idx > dragItem ? idx - 1 : idx, 0, dragged);
    setAusgaben(items);
    setDragItem(null);
    setDragOverItem(null);
  }

  function toggleGroupCollapse(idx: number) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  function moveToGroup(itemIdx: number, targetGroupIdx: number | null) {
    const items = [...ausgaben];
    const item = items.splice(itemIdx, 1)[0];

    if (targetGroupIdx === null) {
      // Move to ungrouped (beginning)
      items.unshift(item);
    } else {
      // Find the end of the target group (next group or end of list)
      let insertAt = targetGroupIdx + 1;
      for (let j = targetGroupIdx + 1; j < items.length; j++) {
        if (items[j].ist_gruppe) break;
        insertAt = j + 1;
      }
      items.splice(insertAt, 0, item);
    }

    setAusgaben(items);
    setMoveMenuIdx(null);
  }

  // Get all group indices for the move menu
  function getGroups() {
    return ausgaben
      .map((a, i) => ({ ...a, _idx: i }))
      .filter(a => a.ist_gruppe);
  }

  const toggle = (s: string) => setOpenSections(prev => ({ ...prev, [s]: !prev[s as keyof typeof prev] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" />
      </div>
    );
  }

  return (
    <div onClick={() => moveMenuIdx !== null && setMoveMenuIdx(null)}>
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

                {verpflegung === "sv" && (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-400">Einkaufsbudget / Person / Tag (Selbstversorger)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={manuelleVp} onChange={e => setManuelleVp(Number(e.target.value) || 0)} min={0} step={0.5}
                        className="w-32 rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm font-bold focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                      <span className="text-xs text-dpsg-gray-500">EUR / Person / Tag</span>
                    </div>
                    <p className="text-[10px] text-dpsg-gray-400 mt-1">Typisch: 8-15 EUR pro Person und Tag für Einkauf bei Selbstverpflegung.</p>
                  </div>
                )}

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
              <div className="flex gap-1.5">
                <button onClick={addGruppe}
                  className="flex items-center gap-1 rounded-lg bg-dpsg-gray-100 px-3 py-1.5 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Gruppe
                </button>
                <button onClick={() => setAusgaben([...ausgaben, { typ: "ausgabe", kategorie: "sonstiges", bezeichnung: "", betrag: 0, ist_auto: false, phase: ausgabenPhase === "alle" ? "kurs" : ausgabenPhase }])}
                  className="flex items-center gap-1 rounded-lg bg-dpsg-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Position
                </button>
              </div>
            </div>
            {openSections.ausgaben && (
              <div>
                <div className="grid grid-cols-[1fr_200px_100px_32px] gap-2 px-5 py-2 border-b border-dpsg-gray-100">
                  {/* Phase tabs */}
                  <div className="px-5 py-2 flex gap-1.5 border-b border-dpsg-gray-100">
                    <button onClick={() => setAusgabenPhase("alle")}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                        ausgabenPhase === "alle" ? "bg-dpsg-blue text-white" : "bg-dpsg-gray-100 text-dpsg-gray-600"
                      }`}>Alle ({berechnetAusgaben.length})</button>
                    {AUSGABEN_PHASEN.map(p => {
                      const count = berechnetAusgaben.filter(a => (a.phase || "kurs") === p.id).length;
                      const sum = berechnetAusgaben.filter(a => (a.phase || "kurs") === p.id).reduce((s, a) => s + Number(a.betrag || 0), 0);
                      return (
                        <button key={p.id} onClick={() => setAusgabenPhase(p.id)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                            ausgabenPhase === p.id ? "bg-dpsg-blue text-white" : "bg-dpsg-gray-100 text-dpsg-gray-600"
                          }`}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: ausgabenPhase === p.id ? "white" : p.color }} />
                          {p.label} ({count}) {sum > 0 ? `${fmt(sum)}€` : ""}
                        </button>
                      );
                    })}
                  </div>
                  {["Bezeichnung", "Kategorie", "Betrag", ""].map(h => (
                    <span key={h} className="text-[10px] font-semibold uppercase tracking-wide text-dpsg-gray-400">{h}</span>
                  ))}
                </div>
                {(() => {
                    const filtered = berechnetAusgaben
                      .map((a, i) => ({ ...a, _idx: i }))
                      .filter(a => ausgabenPhase === "alle" || (a.phase || "kurs") === ausgabenPhase);
                    let groupNum = 0;
                    let itemNum = 0;
                    return filtered.map((a, dispIdx) => {
                      const i = a._idx;
                      const isDragOver = dragOverItem === i;
                      if (a.ist_gruppe) {
                        groupNum++;
                        itemNum = 0;
                        const isCollapsed = collapsedGroups.has(i);
                        const groupItems: typeof filtered = [];
                        for (let j = dispIdx + 1; j < filtered.length; j++) {
                          if (filtered[j].ist_gruppe) break;
                          groupItems.push(filtered[j]);
                        }
                        const subtotal = groupItems.reduce((s, x) => s + Number(x.betrag || 0), 0);
                        return (
                          <div key={`g-${i}`}
                            draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDrop={() => handleDrop(i)}
                            className={`flex items-center gap-2 px-5 py-2.5 bg-dpsg-gray-50 border-b border-dpsg-gray-200 cursor-grab ${isDragOver ? "border-t-2 border-t-dpsg-blue" : ""}`}>
                            <GripVertical className="h-3.5 w-3.5 text-dpsg-gray-300" />
                            <button onClick={() => toggleGroupCollapse(i)}>
                              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-dpsg-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-dpsg-gray-400" />}
                            </button>
                            <span className="text-xs font-bold text-dpsg-blue w-6">{groupNum}.</span>
                            <input value={a.bezeichnung} onChange={e => { const n = [...ausgaben]; n[i] = { ...n[i], bezeichnung: e.target.value }; setAusgaben(n); }}
                              className="flex-1 bg-transparent text-sm font-bold text-dpsg-gray-900 focus:outline-none" />
                            <span className="text-xs font-bold text-dpsg-gray-500 mr-2">{fmt(subtotal)} EUR</span>
                            <button onClick={() => setAusgaben(ausgaben.filter((_, j) => j !== i))}
                              className="text-dpsg-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        );
                      }
                      let insideCollapsed = false;
                      for (let j = dispIdx - 1; j >= 0; j--) {
                        if (filtered[j].ist_gruppe) { insideCollapsed = collapsedGroups.has(filtered[j]._idx); break; }
                      }
                      if (insideCollapsed) return null;
                      itemNum++;
                      const nummer = groupNum > 0 ? `${groupNum}.${itemNum}` : `${itemNum}`;
                      return (
                        <div key={`p-${i}`}
                          draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDrop={() => handleDrop(i)}
                          className={`grid grid-cols-[1fr_180px_100px_56px] gap-2 items-center py-2 border-b border-dpsg-gray-50 hover:bg-dpsg-gray-50 ${isDragOver ? "border-t-2 border-t-dpsg-blue" : ""} ${groupNum > 0 ? "pl-12 pr-5" : "px-5"}`}>
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-3 w-3 text-dpsg-gray-300 cursor-grab" />
                            <span className="text-[10px] font-mono text-dpsg-gray-400 w-8">{nummer}</span>
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
                            <span className="text-right text-sm font-bold text-dpsg-gray-900">{fmt(Number(a.betrag))}</span>
                          ) : (
                            <input type="number" value={a.betrag} onChange={e => { const n = [...ausgaben]; n[i] = { ...n[i], betrag: Number(e.target.value) || 0 }; setAusgaben(n); }}
                              className="w-full rounded border border-dpsg-gray-200 px-2 py-1 text-right text-sm font-bold focus:border-dpsg-blue focus:outline-none" min={0} />
                          )}
                          <div className="flex items-center gap-0.5 relative">
                            {!a.ist_auto && (
                              <>
                                <button onClick={e => { e.stopPropagation(); setMoveMenuIdx(moveMenuIdx === i ? null : i); }}
                                  className="text-dpsg-gray-300 hover:text-dpsg-blue p-0.5" title="Verschieben">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => setAusgaben(ausgaben.filter((_, j) => j !== i))}
                                  className="text-dpsg-gray-300 hover:text-red-500 p-0.5" title="Löschen">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                {moveMenuIdx === i && (
                                  <div className="absolute right-0 top-6 z-20 bg-white border border-dpsg-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-dpsg-gray-400">Verschieben nach</div>
                                    {getGroups().map(g => (
                                      <button key={g._idx} onClick={() => moveToGroup(i, g._idx)}
                                        className="w-full text-left px-3 py-1.5 text-xs text-dpsg-gray-700 hover:bg-dpsg-gray-50 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded bg-dpsg-blue" />{g.bezeichnung}
                                      </button>
                                    ))}
                                    <button onClick={() => moveToGroup(i, null)}
                                      className="w-full text-left px-3 py-1.5 text-xs text-dpsg-gray-400 hover:bg-dpsg-gray-50">Ohne Gruppe</button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
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
              {/* Phase breakdown */}
              {AUSGABEN_PHASEN.map(p => {
                const sum = berechnetAusgaben.filter(a => (a.phase || "kurs") === p.id).reduce((s, a) => s + Number(a.betrag || 0), 0);
                if (sum === 0) return null;
                return (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded" style={{ background: p.color }} />
                      <span className="text-dpsg-gray-600">{p.label}</span>
                    </div>
                    <span className="font-bold text-dpsg-gray-900">{fmt(sum)} EUR</span>
                  </div>
                );
              })}
              <div className="h-px bg-dpsg-gray-100 my-1" />
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
