export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function todayISO(d = new Date()): string {
  return `${monthKey(d)}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** The next date a bill with this due day comes up, today included. Days past a short month's end land on its last day. */
export function nextDueDate(dueDay: number, from = new Date()): Date {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let offset = 0; offset < 2; offset++) {
    const y = start.getFullYear();
    const m = start.getMonth() + offset;
    const day = Math.min(dueDay, daysInMonth(y, m));
    const candidate = new Date(y, m, day);
    if (candidate >= start) return candidate;
  }
  return start;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime() -
    new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  return Math.round(ms / 86_400_000);
}

/** Whole months from today until the target date, at least 1. */
export function monthsUntil(targetISO: string, from = new Date()): number {
  const [y, m] = targetISO.split("-").map(Number);
  const months = (y - from.getFullYear()) * 12 + (m - 1 - from.getMonth());
  return Math.max(1, months);
}

/** "25 sep" in Spanish, "Sep 25" in English. */
export function formatShortDate(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale === "es" ? "es-US" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

export function formatLongDate(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale === "es" ? "es-US" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
