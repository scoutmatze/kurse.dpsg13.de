"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Shield, Users, Calendar, MapPin, Check, AlertTriangle,
  Loader2, ChevronRight, ExternalLink, Heart
} from "lucide-react";

interface KursInfo {
  id: number;
  name: string;
  beschreibung?: string;
  start_datum: string | null;
  end_datum: string | null;
  ort: string | null;
  max_teilnehmende: number | null;
  tn_count: number;
  plaetze_frei: number | null;
  ist_voll: boolean;
}

const ERNAEHRUNG_OPTIONEN = [
  { id: "normal", label: "Alles (keine Einschränkungen)" },
  { id: "vegetarisch", label: "Vegetarisch" },
  { id: "vegan", label: "Vegan" },
  { id: "halal", label: "Halal" },
  { id: "koscher", label: "Koscher" },
  { id: "laktosefrei", label: "Laktosefrei" },
  { id: "glutenfrei", label: "Glutenfrei" },
];

export default function AnmeldungPage() {
  const params = useParams();
  const kursId = params.kursId as string;

  const [kurs, setKurs] = useState<KursInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [warteliste, setWarteliste] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    vorname: "", nachname: "", email: "", telefon: "",
    geburtsdatum: "", stamm: "", bezirk: "", dioezese: "München und Freising",
    strasse: "", plz: "", ort_adresse: "",
    ernaehrung: "normal", allergien: "", unvertraeglichkeiten: "",
    efz_vorhanden: false, efz_datum: "",
    agb_akzeptiert: false, datenschutz_akzeptiert: false, foto_erlaubnis: false,
    anmerkungen: "",
  });

  useEffect(() => {
    fetch(`/api/anmeldung/${kursId}`)
      .then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error); }))
      .then(setKurs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [kursId]);

  function updateForm(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.agb_akzeptiert || !form.datenschutz_akzeptiert) {
      setError("Bitte bestätige die AGBs und den Datenschutzhinweis.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/anmeldung/${kursId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(true);
      setWarteliste(data.warteliste);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(d: string | null) {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dpsg-beige-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-dpsg-blue" />
      </div>
    );
  }

  if (error && !kurs) {
    return (
      <div className="min-h-screen bg-dpsg-beige-50 flex items-center justify-center px-4">
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-8 text-center max-w-sm">
          <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-dpsg-gray-900 mb-2">Anmeldung nicht möglich</h1>
          <p className="text-sm text-dpsg-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-dpsg-beige-50 flex items-center justify-center px-4">
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-8 text-center max-w-md">
          {warteliste ? (
            <>
              <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-dpsg-gray-900 mb-2">Auf der Warteliste</h1>
              <p className="text-sm text-dpsg-gray-500 mb-4">
                Der Kurs ist leider voll. Wir haben dich auf die Warteliste gesetzt und melden uns, sobald ein Platz frei wird.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-dpsg-gray-900 mb-2">Anmeldung eingegangen!</h1>
              <p className="text-sm text-dpsg-gray-500 mb-4">
                Vielen Dank, {form.vorname}! Deine Anmeldung für <strong>{kurs?.name}</strong> ist bei uns eingegangen. Du erhältst eine Bestätigung per E-Mail.
              </p>
            </>
          )}
          <p className="text-xs text-dpsg-gray-400 mt-6">Gut Pfad!</p>
        </div>
      </div>
    );
  }

  const STEPS = [
    { nr: 1, label: "Persönliches" },
    { nr: 2, label: "Adresse & DPSG" },
    { nr: 3, label: "Ernährung & eFZ" },
    { nr: 4, label: "Bestätigung" },
  ];

  return (
    <div className="min-h-screen bg-dpsg-beige-50">
      {/* Hero */}
      <div className="bg-dpsg-blue text-white">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mb-4">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{kurs?.name}</h1>
          <div className="flex items-center justify-center gap-4 text-sm text-white/70">
            {kurs?.ort && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {kurs.ort}</span>}
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(kurs?.start_datum || null)} \u2013 {formatDate(kurs?.end_datum || null)}</span>
          </div>
          {kurs?.plaetze_frei !== null && (
            <div className="mt-3">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                kurs?.ist_voll ? "bg-red-500/20 text-red-200" : "bg-green-500/20 text-green-200"
              }`}>
                <Users className="h-3 w-3" /> {kurs?.ist_voll ? "Warteliste" : `${kurs?.plaetze_frei} Plätze frei`}
              </span>
            </div>
          )}
        </div>
        <div className="h-[3px] bg-dpsg-red" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map(s => (
            <button key={s.nr} onClick={() => setStep(s.nr)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                step === s.nr ? "bg-dpsg-blue text-white" :
                step > s.nr ? "bg-green-100 text-green-700" : "bg-dpsg-gray-100 text-dpsg-gray-500"
              }`}>
              {step > s.nr ? <Check className="h-3 w-3" /> : <span>{s.nr}</span>}
              {s.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm">
          <div className="p-6">
            {/* Step 1: Persönliches */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-dpsg-gray-900 mb-4">Persönliche Daten</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Vorname *</label>
                    <input value={form.vorname} onChange={e => updateForm("vorname", e.target.value)}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Nachname *</label>
                    <input value={form.nachname} onChange={e => updateForm("nachname", e.target.value)}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">E-Mail *</label>
                  <input type="email" value={form.email} onChange={e => updateForm("email", e.target.value)}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Telefon</label>
                    <input value={form.telefon} onChange={e => updateForm("telefon", e.target.value)}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Geburtsdatum</label>
                    <input type="date" value={form.geburtsdatum} onChange={e => updateForm("geburtsdatum", e.target.value)}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Adresse & DPSG */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-dpsg-gray-900 mb-4">Adresse & DPSG-Zugehörigkeit</h2>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Straße + Hausnummer</label>
                  <input value={form.strasse} onChange={e => updateForm("strasse", e.target.value)}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">PLZ</label>
                    <input value={form.plz} onChange={e => updateForm("plz", e.target.value)}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Ort</label>
                    <input value={form.ort_adresse} onChange={e => updateForm("ort_adresse", e.target.value)}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                  </div>
                </div>
                <div className="h-px bg-dpsg-gray-100 my-2" />
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Stamm</label>
                    <input value={form.stamm} onChange={e => updateForm("stamm", e.target.value)}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                      placeholder="z.B. Condor" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Bezirk</label>
                    <input value={form.bezirk} onChange={e => updateForm("bezirk", e.target.value)}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Diözese</label>
                    <input value={form.dioezese} onChange={e => updateForm("dioezese", e.target.value)}
                      className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Ernährung & eFZ */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-dpsg-gray-900 mb-4">Ernährung & erweitertes Führungszeugnis</h2>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-dpsg-gray-600">Ernährung</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ERNAEHRUNG_OPTIONEN.map(o => (
                      <button key={o.id} onClick={() => updateForm("ernaehrung", o.id)}
                        className={`text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                          form.ernaehrung === o.id
                            ? "border-dpsg-blue bg-dpsg-blue/10 text-dpsg-blue"
                            : "border-dpsg-gray-200 text-dpsg-gray-600 hover:bg-dpsg-gray-50"
                        }`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Allergien</label>
                  <input value={form.allergien} onChange={e => updateForm("allergien", e.target.value)}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                    placeholder="z.B. Nüsse, Erdbeeren" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Unverträglichkeiten</label>
                  <input value={form.unvertraeglichkeiten} onChange={e => updateForm("unvertraeglichkeiten", e.target.value)}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                    placeholder="z.B. Laktose, Gluten" />
                </div>
                <div className="h-px bg-dpsg-gray-100 my-2" />
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.efz_vorhanden} onChange={e => updateForm("efz_vorhanden", e.target.checked)}
                      className="accent-dpsg-blue w-4 h-4" />
                    <span className="text-sm text-dpsg-gray-700">Ich habe ein gültiges erweitertes Führungszeugnis (eFZ)</span>
                  </label>
                  {form.efz_vorhanden && (
                    <div className="mt-2 ml-7">
                      <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Datum der Einsichtnahme</label>
                      <input type="date" value={form.efz_datum} onChange={e => updateForm("efz_datum", e.target.value)}
                        className="rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Anmerkungen</label>
                  <textarea value={form.anmerkungen} onChange={e => updateForm("anmerkungen", e.target.value)}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                    rows={3} placeholder="Sonstige Hinweise, Medikamente, Mobilitätseinschränkungen..." />
                </div>
              </div>
            )}

            {/* Step 4: Bestätigung */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-dpsg-gray-900 mb-4">Bestätigung</h2>
                <div className="rounded-lg bg-dpsg-gray-50 p-4 text-sm text-dpsg-gray-700 space-y-1">
                  <p><strong>{form.vorname} {form.nachname}</strong></p>
                  <p>{form.email} {form.telefon && `· ${form.telefon}`}</p>
                  {form.stamm && <p>Stamm {form.stamm}{form.bezirk && `, Bezirk ${form.bezirk}`}</p>}
                  <p>Ernährung: {ERNAEHRUNG_OPTIONEN.find(o => o.id === form.ernaehrung)?.label}</p>
                  {form.allergien && <p>Allergien: {form.allergien}</p>}
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.agb_akzeptiert} onChange={e => updateForm("agb_akzeptiert", e.target.checked)}
                      className="accent-dpsg-blue w-4 h-4 mt-0.5" />
                    <span className="text-sm text-dpsg-gray-700">
                      Ich akzeptiere die{" "}
                      <a href="https://tools.dpsg.de/anmeldung/upload/surveys/654278/files/AGBs_bl_190212.pdf"
                        target="_blank" rel="noopener noreferrer" className="text-dpsg-blue underline hover:text-dpsg-blue-light">
                        AGBs der DPSG <ExternalLink className="inline h-3 w-3" />
                      </a> *
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.datenschutz_akzeptiert} onChange={e => updateForm("datenschutz_akzeptiert", e.target.checked)}
                      className="accent-dpsg-blue w-4 h-4 mt-0.5" />
                    <span className="text-sm text-dpsg-gray-700">
                      Ich stimme der Verarbeitung meiner Daten gemäß DSGVO zu. *
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.foto_erlaubnis} onChange={e => updateForm("foto_erlaubnis", e.target.checked)}
                      className="accent-dpsg-blue w-4 h-4 mt-0.5" />
                    <span className="text-sm text-dpsg-gray-700">
                      Ich bin damit einverstanden, dass Fotos von mir während der Veranstaltung gemacht und veröffentlicht werden dürfen.
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-dpsg-gray-100 px-6 py-4">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)}
                className="rounded-lg bg-dpsg-gray-100 px-4 py-2 text-sm font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">
                Zurück
              </button>
            ) : <div />}

            {step < 4 ? (
              <button onClick={() => setStep(step + 1)}
                className="flex items-center gap-1.5 rounded-lg bg-dpsg-blue px-4 py-2 text-sm font-bold text-white hover:bg-dpsg-blue-light transition-colors">
                Weiter <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting || !form.agb_akzeptiert || !form.datenschutz_akzeptiert}
                className="flex items-center gap-1.5 rounded-lg bg-dpsg-red px-5 py-2.5 text-sm font-bold text-white hover:bg-dpsg-red-light transition-colors disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
                {submitting ? "Wird gesendet..." : "Verbindlich anmelden"}
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-center text-dpsg-gray-400 mt-8">
          Deutsche Pfadfinder*innenschaft Sankt Georg &middot; Gut Pfad!
        </p>
      </div>
    </div>
  );
}
