"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";

interface Block {
  tag_nummer: number;
  tag_titel: string;
  start_zeit: string;
  end_zeit: string;
  titel: string;
  typ: string;
  raum?: string;
  verantwortlich?: string;
  beschreibung?: string;
}

const TYP_LABELS: Record<string, string> = {
  programm: "Programm", workshop: "Workshop", plenum: "Plenum",
  pause: "Pause", essen: "Essen", freizeit: "Freizeit", orga: "Orga",
};

export default function DruckansichtPage() {
  const params = useParams();
  const kursId = params.id as string;
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [kursName, setKursName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/programm/${kursId}`).then(r => r.json()),
      fetch(`/api/kurse/${kursId}`).then(r => r.json()),
    ]).then(([progData, kursData]) => {
      setKursName(kursData.name);
      const flat: Block[] = [];
      for (const tag of progData) {
        for (const block of tag.blocks || []) {
          flat.push({ ...block, tag_nummer: tag.tag_nummer, tag_titel: tag.tag_titel });
        }
      }
      setBlocks(flat);
      setLoading(false);
    });
  }, [kursId]);

  const tage = [...new Set(blocks.map(b => b.tag_nummer))].sort();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-dpsg-gray-400" /></div>;
  }

  return (
    <div>
      {/* Screen-only toolbar */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-sm text-dpsg-gray-600 hover:text-dpsg-blue">
          <ArrowLeft className="h-4 w-4" /> Zurück zum Tagesplan
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-dpsg-blue px-4 py-2 text-sm font-bold text-white hover:bg-dpsg-blue-light">
          <Printer className="h-4 w-4" /> Drucken
        </button>
      </div>

      {/* Print content */}
      <div className="print:p-0">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-dpsg-gray-900">{kursName}</h1>
          <p className="text-sm text-dpsg-gray-500">Programmübersicht</p>
        </div>

        {tage.map(tagNr => {
          const tagBlocks = blocks.filter(b => b.tag_nummer === tagNr).sort((a, b) => a.start_zeit.localeCompare(b.start_zeit));
          const tagTitel = tagBlocks[0]?.tag_titel || `Tag ${tagNr}`;
          return (
            <div key={tagNr} className="mb-6 break-inside-avoid">
              <h2 className="text-base font-bold text-dpsg-blue border-b-2 border-dpsg-blue pb-1 mb-2">
                Tag {tagNr}: {tagTitel}
              </h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-dpsg-gray-50">
                    <th className="text-left px-2 py-1.5 text-xs font-semibold text-dpsg-gray-500 w-20">Zeit</th>
                    <th className="text-left px-2 py-1.5 text-xs font-semibold text-dpsg-gray-500">Programmpunkt</th>
                    <th className="text-left px-2 py-1.5 text-xs font-semibold text-dpsg-gray-500 w-20">Typ</th>
                    <th className="text-left px-2 py-1.5 text-xs font-semibold text-dpsg-gray-500 w-28">Raum</th>
                    <th className="text-left px-2 py-1.5 text-xs font-semibold text-dpsg-gray-500 w-28">Verantwortlich</th>
                  </tr>
                </thead>
                <tbody>
                  {tagBlocks.map((b, i) => (
                    <tr key={i} className="border-b border-dpsg-gray-100">
                      <td className="px-2 py-1.5 text-xs font-mono text-dpsg-gray-600 align-top">
                        {b.start_zeit?.slice(0, 5)}-{b.end_zeit?.slice(0, 5)}
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <div className="font-semibold text-dpsg-gray-900">{b.titel}</div>
                        {b.beschreibung && <div className="text-xs text-dpsg-gray-500 mt-0.5">{b.beschreibung}</div>}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-dpsg-gray-500 align-top">{TYP_LABELS[b.typ] || b.typ}</td>
                      <td className="px-2 py-1.5 text-xs text-dpsg-gray-600 align-top">{b.raum || ""}</td>
                      <td className="px-2 py-1.5 text-xs text-dpsg-gray-600 align-top">{b.verantwortlich || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        <div className="text-center text-xs text-dpsg-gray-400 mt-8 print:mt-4">
          Deutsche Pfadfinder*innenschaft Sankt Georg &middot; Gut Pfad!
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { font-size: 11px; }
          nav, aside, header { display: none !important; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
