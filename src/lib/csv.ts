import type { Entry } from "./types";

function cell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Everything logged, one row per entry. Amounts in dollars, dates as YYYY-MM-DD. */
export function entriesToCsv(entries: Entry[]): string {
  const header = ["date", "type", "category", "amount_usd", "note"];
  const rows = entries.map((e) => [e.date, e.type, e.category, (e.amount_cents / 100).toFixed(2), e.note]);
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\n") + "\n";
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
