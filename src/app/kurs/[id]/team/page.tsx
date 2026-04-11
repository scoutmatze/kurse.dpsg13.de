"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  UserPlus, Plus, Trash2, X, Loader2, Phone, Mail,
  Shield, UtensilsCrossed, Eye, Wrench, Users, Pencil, Check
} from "lucide-react";

interface TeamMember {
  id: number;
  user_id?: number;
  rolle: string;
  name: string;
  email?: string;
  telefon?: string;
  user_name?: string;
  user_email?: string;
}

const ROLLEN = [
  { id: "kursleitung", label: "Kursleitung", icon: Shield, color: "#003056" },
  { id: "referentin", label: "Referent*in", icon: Users, color: "#7c3aed" },
  { id: "awareness", label: "Awareness", icon: Eye, color: "#0891b2" },
  { id: "kueche", label: "Küche", icon: UtensilsCrossed, color: "#b45309" },
  { id: "helfer", label: "Helfer*in", icon: Wrench, color: "#5c5850" },
];

export default function TeamPage() {
  const params = useParams();
  const kursId = params.id as string;

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [newMember, setNewMember] = useState({ name: "", email: "", telefon: "", rolle: "helfer" });

  useEffect(() => { load(); }, [kursId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/team/${kursId}`);
      if (res.ok) setTeam(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function addMember() {
    if (!newMember.name.trim()) return;
    await fetch(`/api/team/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", ...newMember }),
    });
    await load();
    setShowAdd(false);
    setNewMember({ name: "", email: "", telefon: "", rolle: "helfer" });
  }

  async function updateMember(m: TeamMember) {
    await fetch(`/api/team/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", member_id: m.id, rolle: m.rolle, name: m.name, email: m.email, telefon: m.telefon }),
    });
    setEditId(null);
    await load();
  }

  async function deleteMember(id: number) {
    await fetch(`/api/team/${kursId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", member_id: id }),
    });
    await load();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;
  }

  const grouped = ROLLEN.map(r => ({
    ...r,
    members: team.filter(m => m.rolle === r.id),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserPlus className="h-5 w-5 text-dpsg-blue" />
          <h2 className="text-lg font-bold text-dpsg-gray-900">Team</h2>
          <span className="text-xs text-dpsg-gray-400">{team.length} Mitglieder</span>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors">
          <Plus className="h-3.5 w-3.5" /> Teammitglied
        </button>
      </div>

      {/* Role Stats */}
      <div className="flex gap-3 mb-6">
        {grouped.filter(g => g.members.length > 0).map(g => (
          <div key={g.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-dpsg-gray-200">
            <g.icon className="h-3.5 w-3.5" style={{ color: g.color }} />
            <span className="text-xs font-semibold text-dpsg-gray-700">{g.members.length} {g.label}</span>
          </div>
        ))}
      </div>

      {team.length === 0 ? (
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm p-12 text-center">
          <UserPlus className="h-12 w-12 text-dpsg-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-dpsg-gray-700 mb-2">Noch kein Team</h3>
          <p className="text-sm text-dpsg-gray-500 mb-6">Füge Kursleitung, Referent*innen und Helfer*innen hinzu.</p>
          <button onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-dpsg-red px-5 py-2.5 text-sm font-bold text-white hover:bg-dpsg-red-light transition-colors">
            <Plus className="h-4 w-4" /> Erste*n Teamende*n hinzufügen
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {team.map(m => {
            const rolle = ROLLEN.find(r => r.id === m.rolle) || ROLLEN[4];
            const RolleIcon = rolle.icon;
            const isEditing = editId === m.id;

            return (
              <div key={m.id} className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: rolle.color + "15" }}>
                        <RolleIcon className="h-4 w-4" style={{ color: rolle.color }} />
                      </div>
                      <div>
                        {isEditing ? (
                          <input value={m.name} onChange={e => setTeam(team.map(x => x.id === m.id ? { ...x, name: e.target.value } : x))}
                            className="text-sm font-bold text-dpsg-gray-900 border border-dpsg-gray-200 rounded px-2 py-0.5 focus:border-dpsg-blue focus:outline-none" />
                        ) : (
                          <div className="text-sm font-bold text-dpsg-gray-900">{m.name}</div>
                        )}
                        {isEditing ? (
                          <select value={m.rolle} onChange={e => setTeam(team.map(x => x.id === m.id ? { ...x, rolle: e.target.value } : x))}
                            className="text-[10px] border border-dpsg-gray-200 rounded px-1 py-0.5 mt-0.5 focus:border-dpsg-blue focus:outline-none">
                            {ROLLEN.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                          </select>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: rolle.color }}>{rolle.label}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {isEditing ? (
                        <button onClick={() => updateMember(m)} className="p-1 rounded text-green-600 hover:bg-green-50"><Check className="h-3.5 w-3.5" /></button>
                      ) : (
                        <button onClick={() => setEditId(m.id)} className="p-1 rounded text-dpsg-gray-400 hover:text-dpsg-blue hover:bg-dpsg-blue/10"><Pencil className="h-3.5 w-3.5" /></button>
                      )}
                      <button onClick={() => deleteMember(m.id)} className="p-1 rounded text-dpsg-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>

                  {(m.email || m.telefon) && (
                    <div className="space-y-1 text-xs text-dpsg-gray-500">
                      {m.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-dpsg-gray-400" />
                          {isEditing ? (
                            <input value={m.email || ""} onChange={e => setTeam(team.map(x => x.id === m.id ? { ...x, email: e.target.value } : x))}
                              className="flex-1 border border-dpsg-gray-200 rounded px-1 py-0.5 text-xs focus:border-dpsg-blue focus:outline-none" />
                          ) : (
                            <a href={`mailto:${m.email}`} className="text-dpsg-blue hover:underline">{m.email}</a>
                          )}
                        </div>
                      )}
                      {m.telefon && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-dpsg-gray-400" />
                          {isEditing ? (
                            <input value={m.telefon || ""} onChange={e => setTeam(team.map(x => x.id === m.id ? { ...x, telefon: e.target.value } : x))}
                              className="flex-1 border border-dpsg-gray-200 rounded px-1 py-0.5 text-xs focus:border-dpsg-blue focus:outline-none" />
                          ) : (
                            <a href={`tel:${m.telefon}`} className="hover:underline">{m.telefon}</a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl bg-white shadow-lg w-full max-w-sm">
            <div className="flex items-center justify-between border-b border-dpsg-gray-100 px-5 py-4">
              <h3 className="text-base font-bold text-dpsg-gray-900">Neues Teammitglied</h3>
              <button onClick={() => setShowAdd(false)} className="text-dpsg-gray-400 hover:text-dpsg-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Name *</label>
                <input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" autoFocus />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-dpsg-gray-600">Rolle</label>
                <div className="flex flex-wrap gap-1.5">
                  {ROLLEN.map(r => (
                    <button key={r.id} onClick={() => setNewMember({ ...newMember, rolle: r.id })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        newMember.rolle === r.id ? "border-dpsg-blue bg-dpsg-blue/10 text-dpsg-blue" : "border-dpsg-gray-200 text-dpsg-gray-600"
                      }`}>
                      <r.icon size={12} /> {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">E-Mail</label>
                <input type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dpsg-gray-600">Telefon</label>
                <input value={newMember.telefon} onChange={e => setNewMember({ ...newMember, telefon: e.target.value })}
                  className="w-full rounded-lg border border-dpsg-gray-200 px-3 py-2 text-sm focus:border-dpsg-blue focus:outline-none focus:ring-2 focus:ring-dpsg-blue/20" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-dpsg-gray-100 px-5 py-4">
              <button onClick={() => setShowAdd(false)}
                className="rounded-lg bg-dpsg-gray-100 px-4 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors">Abbrechen</button>
              <button onClick={addMember} disabled={!newMember.name.trim()}
                className="rounded-lg bg-dpsg-blue px-4 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors disabled:opacity-50">Hinzufügen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
