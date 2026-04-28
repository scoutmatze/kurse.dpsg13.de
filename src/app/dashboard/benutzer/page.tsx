"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Plus, Trash2, X, Loader2, KeyRound, ArrowLeft, Shield
} from "lucide-react";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

const ROLES = [
  { id: "tenant_admin", label: "Tenant Admin", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "admin", label: "Admin", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "user", label: "User", cls: "bg-dpsg-gray-100 text-dpsg-gray-600 border-dpsg-gray-200" },
];

export default function BenutzerPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", name: "", pin: "", role: "user" });
  const [resetPinId, setResetPinId] = useState<number | null>(null);
  const [newPin, setNewPin] = useState("");
  const router = useRouter();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function addUser() {
    if (!newUser.email || !newUser.pin) return;
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      await load();
      setShowAdd(false);
      setNewUser({ email: "", name: "", pin: "", role: "user" });
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-dpsg-beige-50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-dpsg-beige-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.push("/dashboard")} className="text-dpsg-gray-400 hover:text-dpsg-blue"><ArrowLeft className="h-4 w-4" /></button>
          <Users className="h-5 w-5 text-dpsg-blue" />
          <h1 className="text-2xl font-bold text-dpsg-gray-900">Benutzer*innen</h1>
          <span className="text-xs text-dpsg-gray-400">{users.length} Accounts</span>
        </div>
        <p className="text-sm text-dpsg-gray-500 mb-6 ml-11">Benutzer*innen mit PIN-Zugang verwalten. Azure AD Benutzer*innen werden automatisch angelegt.</p>

        <div className="flex justify-end mb-4">
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors">
            <Plus className="h-3.5 w-3.5" /> Benutzer*in anlegen
          </button>
        </div>

        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dpsg-gray-100 bg-dpsg-gray-50">
                {["Name", "E-Mail", "Rolle", "Erstellt", "PIN"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dpsg-gray-50">
              {users.map(u => {
                const role = ROLES.find(r => r.id === u.role) || ROLES[2];
                return (
                  <tr key={u.id} className="hover:bg-dpsg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-dpsg-gray-900">{u.name || "\u2014"}</td>
                    <td className="px-4 py-3 text-dpsg-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${role.cls}`}>{role.label}</span>
                    </td>
                    <td className="px-4 py-3 text-dpsg-gray-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString("de-DE")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {showAdd && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="rounded-xl bg-white shadow-lg w-full max-w-sm">
              <div className="flex items-center justify-between border-b border-dpsg-gray-100 px-5 py-4">
                <h3 className="text-base font-bold text-dpsg-gray-900">Neue*r Benutzer*in</h3>
                <button onClick={() => setShowAdd(false)} className="text-dpsg-gray-400"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">E-Mail *</label>
                  <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" autoFocus />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Name</label>
                  <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">PIN *</label>
                  <input value={newUser.pin} onChange={e => setNewUser({ ...newUser, pin: e.target.value })}
                    className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-dpsg-gray-600">Rolle</label>
                  <div className="flex gap-2">
                    {ROLES.map(r => (
                      <button key={r.id} onClick={() => setNewUser({ ...newUser, role: r.id })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          newUser.role === r.id ? "border-dpsg-blue bg-dpsg-blue/10 text-dpsg-blue" : "border-dpsg-gray-200 text-dpsg-gray-600"
                        }`}>{r.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-dpsg-gray-100 px-5 py-4">
                <button onClick={() => setShowAdd(false)} className="rounded-lg bg-dpsg-gray-100 px-4 py-2 text-xs font-bold text-dpsg-gray-700">Abbrechen</button>
                <button onClick={addUser} disabled={!newUser.email || !newUser.pin}
                  className="rounded-lg bg-dpsg-blue px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Anlegen</button>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-center text-dpsg-gray-400 mt-8">Deutsche Pfadfinder*innenschaft Sankt Georg &middot; Gut Pfad!</p>
      </div>
    </div>
  );
}
