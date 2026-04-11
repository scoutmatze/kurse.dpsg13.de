"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Shield, Mail, KeyRound } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login fehlgeschlagen");
      window.location.href = "/dashboard";
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
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-dpsg-gray-900">Kursmanagement</h1>
          <p className="text-sm text-dpsg-gray-500 mt-1">Deutsche Pfadfinder*innenschaft Sankt Georg</p>
        </div>

        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm">
          <div className="border-b border-dpsg-gray-100 bg-dpsg-gray-50 px-5 py-3 rounded-t-xl">
            <h2 className="text-sm font-bold text-dpsg-gray-700 flex items-center gap-2">
              <LogIn className="h-4 w-4 text-dpsg-blue" /> Anmelden
            </h2>
          </div>
          <div className="p-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">E-Mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-dpsg-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-dpsg-gray-200 pl-10 pr-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                    placeholder="deine@email.de" required />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">PIN</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-dpsg-gray-400" />
                  <input type="password" value={pin} onChange={e => setPin(e.target.value)}
                    className="w-full rounded-lg border border-dpsg-gray-200 pl-10 pr-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20"
                    placeholder="Dein PIN" required />
                </div>
              </div>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
              )}
              <button type="submit" disabled={loading}
                className="w-full rounded-lg bg-dpsg-blue py-2.5 text-sm font-bold text-white hover:bg-dpsg-blue-light transition-colors disabled:opacity-50">
                {loading ? "Wird angemeldet..." : "Anmelden"}
              </button>
            </form>
            <div className="mt-4 text-center">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dpsg-gray-100" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-dpsg-gray-400">oder</span></div>
              </div>
              <a href="/api/auth/azure"
                className="inline-flex items-center gap-2 rounded-lg border border-dpsg-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-dpsg-gray-700 hover:bg-dpsg-gray-50 transition-colors w-full justify-center">
                <svg className="h-4 w-4" viewBox="0 0 21 21"><path fill="#f25022" d="M0 0h10v10H0z"/><path fill="#7fba00" d="M11 0h10v10H11z"/><path fill="#00a4ef" d="M0 11h10v10H0z"/><path fill="#ffb900" d="M11 11h10v10H11z"/></svg>
                Mit Microsoft anmelden
              </a>
            </div>
          </div>
        </div>
        <p className="text-xs mt-8 text-center text-dpsg-gray-400">Deutsche Pfadfinder*innenschaft Sankt Georg &middot; Gut Pfad!</p>
      </div>
    </div>
  );
}
