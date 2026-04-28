"use client";
import { Suspense } from "react";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, KeyRound, Mail, Check, Loader2, ArrowLeft } from "lucide-react";

function PinResetInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError("Etwas ist schiefgelaufen.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (pin !== pinConfirm) {
      setError("PINs stimmen nicht überein.");
      return;
    }
    if (pin.length < 4) {
      setError("PIN muss mindestens 4 Zeichen haben.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-dpsg-beige-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-dpsg-blue mb-4">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-dpsg-gray-900">PIN zurücksetzen</h1>
          <p className="text-sm text-dpsg-gray-500 mt-1">DPSG Kursmanagement</p>
        </div>

        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm">
          <div className="p-5">
            {/* Step 1: Request reset (no token) */}
            {!token && !sent && (
              <form onSubmit={requestReset} className="space-y-4">
                <p className="text-sm text-dpsg-gray-600">Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen deiner PIN.</p>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">E-Mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-dpsg-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-dpsg-gray-200 pl-10 pr-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                      placeholder="deine@email.de" required />
                  </div>
                </div>
                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full rounded-lg bg-dpsg-blue py-2.5 text-sm font-bold text-white hover:bg-dpsg-blue-light disabled:opacity-50">
                  {loading ? "Wird gesendet..." : "Reset-Link senden"}
                </button>
              </form>
            )}

            {/* Step 1b: Email sent */}
            {!token && sent && (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-base font-bold text-dpsg-gray-900 mb-2">E-Mail gesendet!</h2>
                <p className="text-sm text-dpsg-gray-500">Falls ein Account mit dieser E-Mail existiert, erhältst du einen Reset-Link. Prüfe auch deinen Spam-Ordner.</p>
              </div>
            )}

            {/* Step 2: Set new PIN (with token) */}
            {token && !resetDone && (
              <form onSubmit={confirmReset} className="space-y-4">
                <p className="text-sm text-dpsg-gray-600">Wähle eine neue PIN für deinen Account.</p>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Neue PIN</label>
                  <input type="password" value={pin} onChange={e => setPin(e.target.value)}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                    placeholder="Mindestens 4 Zeichen" required minLength={4} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">PIN bestätigen</label>
                  <input type="password" value={pinConfirm} onChange={e => setPinConfirm(e.target.value)}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                    placeholder="PIN wiederholen" required minLength={4} />
                </div>
                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full rounded-lg bg-dpsg-blue py-2.5 text-sm font-bold text-white hover:bg-dpsg-blue-light disabled:opacity-50">
                  {loading ? "Wird gespeichert..." : "Neue PIN setzen"}
                </button>
              </form>
            )}

            {/* Step 3: Done */}
            {token && resetDone && (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-base font-bold text-dpsg-gray-900 mb-2">PIN geändert!</h2>
                <p className="text-sm text-dpsg-gray-500 mb-4">Du kannst dich jetzt mit deiner neuen PIN anmelden.</p>
                <a href="/login" className="inline-flex items-center gap-2 rounded-lg bg-dpsg-blue px-4 py-2.5 text-sm font-bold text-white">
                  Zum Login
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <a href="/login" className="text-xs text-dpsg-gray-400 hover:text-dpsg-blue flex items-center justify-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Zurück zum Login
          </a>
        </div>

        <p className="text-xs mt-6 text-center text-dpsg-gray-400">Deutsche Pfadfinder*innenschaft Sankt Georg &middot; Gut Pfad!</p>
      </div>
    </div>
  );
}


export default function PinResetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dpsg-beige-50 flex items-center justify-center"><div className="text-dpsg-gray-400">Laden...</div></div>}>
      <PinResetInner />
    </Suspense>
  );
}
