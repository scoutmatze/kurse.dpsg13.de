export function toCsv(headers: string[], rows: Record<string, unknown>[], keys: string[]): string {
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const lines = [headers.map(escape).join(";")];
  for (const row of rows) {
    lines.push(keys.map(k => escape(row[k])).join(";"));
  }
  return "\uFEFF" + lines.join("\n"); // BOM for Excel
}
