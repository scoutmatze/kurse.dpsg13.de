"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  FolderOpen, Upload, Trash2, Download, Loader2, File,
  FileText, FileImage, FileSpreadsheet, FileArchive,
  Plus, X, Filter
} from "lucide-react";

interface Datei {
  id: number;
  name: string;
  pfad: string;
  mime_type: string;
  groesse: number;
  kategorie: string;
  hochgeladen_von_name?: string;
  created_at: string;
}

const KATEGORIEN = [
  { id: "konzept", label: "Konzept" },
  { id: "genehmigung", label: "Genehmigung" },
  { id: "versicherung", label: "Versicherung" },
  { id: "programm", label: "Programm" },
  { id: "material", label: "Material" },
  { id: "foto", label: "Foto" },
  { id: "sonstiges", label: "Sonstiges" },
];

function fileIcon(mime: string) {
  if (mime?.startsWith("image/")) return FileImage;
  if (mime?.includes("pdf") || mime?.includes("document")) return FileText;
  if (mime?.includes("sheet") || mime?.includes("csv")) return FileSpreadsheet;
  if (mime?.includes("zip") || mime?.includes("archive")) return FileArchive;
  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function DateienPage() {
  const params = useParams();
  const kursId = params.id as string;

  const [dateien, setDateien] = useState<Datei[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterKat, setFilterKat] = useState("alle");
  const [uploadKat, setUploadKat] = useState("sonstiges");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [kursId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dateien/${kursId}`);
      if (res.ok) setDateien(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("kategorie", uploadKat);
        await fetch(`/api/dateien/${kursId}`, { method: "POST", body: formData });
      }
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function deleteDatei(id: number) {
    if (!confirm("Datei wirklich löschen?")) return;
    await fetch(`/api/dateien/${kursId}/${id}`, { method: "DELETE" });
    await load();
  }

  const filtered = filterKat === "alle" ? dateien : dateien.filter(d => d.kategorie === filterKat);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-dpsg-blue" />
          <h2 className="text-lg font-bold text-dpsg-gray-900">Dateien</h2>
          <span className="text-xs text-dpsg-gray-400">{dateien.length} Dateien</span>
        </div>
        <div className="flex items-center gap-2">
          <select value={uploadKat} onChange={e => setUploadKat(e.target.value)}
            className="rounded-lg border border-dpsg-gray-200 px-2 py-2 text-xs focus:border-dpsg-blue focus:outline-none">
            {KATEGORIEN.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={e => handleUpload(e.target.files)} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors disabled:opacity-50">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Lädt hoch..." : "Hochladen"}
          </button>
        </div>
      </div>

      {/* Kategorie Filter */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        <button onClick={() => setFilterKat("alle")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterKat === "alle" ? "bg-dpsg-blue text-white" : "bg-white border border-dpsg-gray-200 text-dpsg-gray-600 hover:bg-dpsg-gray-50"
          }`}>Alle</button>
        {KATEGORIEN.map(k => {
          const count = dateien.filter(d => d.kategorie === k.id).length;
          if (count === 0) return null;
          return (
            <button key={k.id} onClick={() => setFilterKat(k.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterKat === k.id ? "bg-dpsg-blue text-white" : "bg-white border border-dpsg-gray-200 text-dpsg-gray-600 hover:bg-dpsg-gray-50"
              }`}>{k.label} ({count})</button>
          );
        })}
      </div>

      {dateien.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-dpsg-gray-200 bg-white p-12 text-center">
          <FolderOpen className="h-12 w-12 text-dpsg-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-dpsg-gray-700 mb-2">Noch keine Dateien</h3>
          <p className="text-sm text-dpsg-gray-500 mb-6">Lade Konzepte, Genehmigungen oder andere Dokumente hoch.</p>
          <button onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-dpsg-red px-5 py-2.5 text-sm font-bold text-white hover:bg-dpsg-red-light transition-colors">
            <Upload className="h-4 w-4" /> Erste Datei hochladen
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-dpsg-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dpsg-gray-100 bg-dpsg-gray-50">
                {["Datei", "Kategorie", "Größe", "Hochgeladen von", "Datum", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dpsg-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dpsg-gray-50">
              {filtered.map(d => {
                const Icon = fileIcon(d.mime_type);
                return (
                  <tr key={d.id} className="hover:bg-dpsg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-dpsg-gray-400 flex-shrink-0" />
                        <span className="font-semibold text-dpsg-gray-900 truncate max-w-[200px]">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-dpsg-gray-100 text-dpsg-gray-600 text-[10px] font-semibold border border-dpsg-gray-200">
                        {KATEGORIEN.find(k => k.id === d.kategorie)?.label || d.kategorie}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-dpsg-gray-500 text-xs">{formatSize(d.groesse)}</td>
                    <td className="px-4 py-3 text-dpsg-gray-500 text-xs">{d.hochgeladen_von_name || "\u2014"}</td>
                    <td className="px-4 py-3 text-dpsg-gray-500 text-xs">
                      {new Date(d.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <a href={`/api/dateien/${kursId}/${d.id}`}
                          className="p-1 rounded text-dpsg-gray-400 hover:text-dpsg-blue hover:bg-dpsg-blue/10 transition-colors">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <button onClick={() => deleteDatei(d.id)}
                          className="p-1 rounded text-dpsg-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Drop zone hint */}
      <div className="mt-4 text-center text-xs text-dpsg-gray-400">
        Max. 10 MB pro Datei
      </div>
    </div>
  );
}
