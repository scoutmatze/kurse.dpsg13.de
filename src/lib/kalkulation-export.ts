// Excel-Export der Kurs-Kalkulation. Läuft clientseitig, damit auch noch nicht
// gespeicherte Eingaben und die Auto-Posten (Übernachtung/Verpflegung) exakt so
// exportiert werden, wie sie auf der Seite stehen.

export interface KalkExportPosten {
  nummer?: string | null;
  ist_gruppe?: boolean;
  phase: string; // bereits aufgelöstes Label
  kategorie: string; // bereits aufgelöstes Label
  bezeichnung: string;
  betrag: number;
}

export interface KalkExportData {
  kursName: string;
  zeitraum: string;
  hausName: string;
  verpflegung: string;
  tn: number;
  teamende: number;
  naechte: number;
  teamVorlauf: number;
  ueProNacht: number;
  vpProTag: number;
  tnNaechte: number;
  teamNaechte: number;
  gesamtNaechte: number;
  kostenUe: number;
  kostenVp: number;
  ausgaben: KalkExportPosten[];
  einnahmen: KalkExportPosten[];
  summeAusgaben: number;
  summeEinnahmenOhneTn: number;
  effektiverBeitrag: number;
  autoCalc: boolean;
  summeEinnahmen: number;
  saldo: number;
  proKopf: number;
}

const EUR = '#,##0.00\ "€"';

type Row = (string | number | null)[];

function num(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

export async function exportKalkulationExcel(data: KalkExportData) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // --- Blatt 1: Übersicht ------------------------------------------------
  const uebersicht: Row[] = [
    ["Kalkulation", data.kursName],
    ["Zeitraum", data.zeitraum],
    ["Haus", data.hausName],
    ["Verpflegung", data.verpflegung],
    ["Stand", new Date().toLocaleString("de-DE")],
    [],
    ["Basisdaten", ""],
    ["Teilnehmende", num(data.tn)],
    ["Teamende", num(data.teamende)],
    ["Personen gesamt", num(data.tn) + num(data.teamende)],
    ["Nächte (Kurs)", num(data.naechte)],
    ["Team-Vorlauf (Nächte)", num(data.teamVorlauf)],
    ["Übernachtungen TN", num(data.tnNaechte)],
    ["Übernachtungen Team", num(data.teamNaechte)],
    ["Übernachtungen gesamt", num(data.gesamtNaechte)],
    [],
    ["Sätze", ""],
    ["Übernachtung / Nacht", num(data.ueProNacht)],
    ["Verpflegung / Tag", num(data.vpProTag)],
    ["Kosten Übernachtung", num(data.kostenUe)],
    ["Kosten Verpflegung", num(data.kostenVp)],
    [],
    ["Ergebnis", ""],
    ["Summe Ausgaben", num(data.summeAusgaben)],
    ["Summe Einnahmen", num(data.summeEinnahmen)],
    ["Saldo", num(data.saldo)],
    ["Kosten / Kopf", num(data.proKopf)],
    [
      data.autoCalc ? "TN-Beitrag (automatisch)" : "TN-Beitrag (manuell)",
      num(data.effektiverBeitrag),
    ],
  ];
  const wsU = XLSX.utils.aoa_to_sheet(uebersicht);
  wsU["!cols"] = [{ wch: 28 }, { wch: 24 }];
  // Währungsformat für die Euro-Zeilen (0-basiert: Sätze + Ergebnis)
  for (const r of [17, 18, 19, 20, 23, 24, 25, 26, 27]) {
    const ref = XLSX.utils.encode_cell({ r, c: 1 });
    if (wsU[ref]) wsU[ref].z = EUR;
  }
  XLSX.utils.book_append_sheet(wb, wsU, "Übersicht");

  // --- Blatt 2: Ausgaben -------------------------------------------------
  const ausgabenRows: Row[] = [["Nr.", "Phase", "Kategorie", "Bezeichnung", "Betrag"]];
  const eurRowsA: number[] = [];
  let offen: { name: string; summe: number } | null = null;

  const flushGruppe = () => {
    if (offen) {
      ausgabenRows.push(["", "", "", `Zwischensumme ${offen.name}`, num(offen.summe)]);
      eurRowsA.push(ausgabenRows.length - 1);
      offen = null;
    }
  };

  for (const p of data.ausgaben) {
    if (p.ist_gruppe) {
      flushGruppe();
      ausgabenRows.push([p.nummer ?? "", p.phase, "", p.bezeichnung, null]);
      offen = { name: p.bezeichnung, summe: 0 };
      continue;
    }
    ausgabenRows.push([p.nummer ?? "", p.phase, p.kategorie, p.bezeichnung, num(p.betrag)]);
    eurRowsA.push(ausgabenRows.length - 1);
    if (offen) offen.summe += num(p.betrag);
  }
  flushGruppe();

  ausgabenRows.push([]);
  ausgabenRows.push(["", "", "", "SUMME AUSGABEN", num(data.summeAusgaben)]);
  eurRowsA.push(ausgabenRows.length - 1);

  const wsA = XLSX.utils.aoa_to_sheet(ausgabenRows);
  wsA["!cols"] = [{ wch: 8 }, { wch: 16 }, { wch: 26 }, { wch: 40 }, { wch: 14 }];
  for (const r of eurRowsA) {
    const ref = XLSX.utils.encode_cell({ r, c: 4 });
    if (wsA[ref]) wsA[ref].z = EUR;
  }
  XLSX.utils.book_append_sheet(wb, wsA, "Ausgaben");

  // --- Blatt 3: Einnahmen ------------------------------------------------
  const einnahmenRows: Row[] = [["Kategorie", "Bezeichnung", "Betrag"]];
  const eurRowsE: number[] = [];
  for (const p of data.einnahmen) {
    einnahmenRows.push([p.kategorie, p.bezeichnung, num(p.betrag)]);
    eurRowsE.push(einnahmenRows.length - 1);
  }
  einnahmenRows.push([
    "Teilnahmebeiträge",
    `${num(data.tn)} TN × ${num(data.effektiverBeitrag)} €`,
    num(data.effektiverBeitrag) * num(data.tn),
  ]);
  eurRowsE.push(einnahmenRows.length - 1);
  einnahmenRows.push([]);
  einnahmenRows.push(["", "SUMME EINNAHMEN", num(data.summeEinnahmen)]);
  eurRowsE.push(einnahmenRows.length - 1);
  einnahmenRows.push(["", "Saldo (Einnahmen − Ausgaben)", num(data.saldo)]);
  eurRowsE.push(einnahmenRows.length - 1);

  const wsE = XLSX.utils.aoa_to_sheet(einnahmenRows);
  wsE["!cols"] = [{ wch: 26 }, { wch: 40 }, { wch: 14 }];
  for (const r of eurRowsE) {
    const ref = XLSX.utils.encode_cell({ r, c: 2 });
    if (wsE[ref]) wsE[ref].z = EUR;
  }
  XLSX.utils.book_append_sheet(wb, wsE, "Einnahmen");

  // --- Download ----------------------------------------------------------
  const safeName = (data.kursName || "Kurs").replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 60);

  // Bewusst über Blob statt XLSX.writeFile: writeFile hängt an der
  // fs-Erkennung von SheetJS und ist im Bundle nicht zuverlässig.
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Kalkulation_${safeName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
