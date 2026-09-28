import type { Entry } from "./types";

// Spending patterns (Plus): what the person's own logged expenses show about
// when and how they spend. Only with enough data (15+ expenses over 3+ weeks),
// and only patterns strong enough to be worth saying. Entries have a date but
// no time, so patterns are by day, not hour.

export type Pattern =
  | { kind: "topDay"; weekday: number; share: number } // 0 = Sunday
  | { kind: "weekend"; more: number } // weekend per-day spending vs. weekday, as a share (0.6 = 60% more)
  | { kind: "afterPayday"; more: number } // 3 days after payday vs. other days
  | { kind: "topCategory"; category: string; share: number };

export const MIN_EXPENSES = 15;
export const MIN_DAYS = 21;

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dayNumber(iso: string): number {
  return Math.round(parse(iso).getTime() / 86_400_000);
}

export function hasEnoughData(recent: Entry[]): boolean {
  const exp = recent.filter((e) => e.type === "expense");
  if (exp.length < MIN_EXPENSES) return false;
  const days = exp.map((e) => dayNumber(e.date));
  return Math.max(...days) - Math.min(...days) + 1 >= MIN_DAYS;
}

export function spendingPatterns(recent: Entry[]): Pattern[] {
  if (!hasEnoughData(recent)) return [];
  const exp = recent.filter((e) => e.type === "expense");
  const total = exp.reduce((t, e) => t + e.amount_cents, 0);
  if (total <= 0) return [];
  const first = Math.min(...exp.map((e) => dayNumber(e.date)));
  const last = Math.max(...exp.map((e) => dayNumber(e.date)));
  const out: Pattern[] = [];

  // Biggest day of the week, if it clearly stands out (well above 1/7).
  const byDay = Array(7).fill(0) as number[];
  for (const e of exp) byDay[parse(e.date).getDay()] += e.amount_cents;
  const topDay = byDay.indexOf(Math.max(...byDay));
  const topShare = byDay[topDay] / total;
  if (topShare >= 0.22) out.push({ kind: "topDay", weekday: topDay, share: topShare });

  // Weekend vs. weekday, per calendar day in the period.
  let weekendDays = 0;
  let weekdays = 0;
  for (let d = first; d <= last; d++) {
    const wd = new Date(d * 86_400_000).getUTCDay();
    if (wd === 0 || wd === 6) weekendDays++;
    else weekdays++;
  }
  const weekendSpend = byDay[0] + byDay[6];
  if (weekendDays > 0 && weekdays > 0) {
    const perWeekend = weekendSpend / weekendDays;
    const perWeekday = (total - weekendSpend) / weekdays;
    if (perWeekday > 0 && perWeekend / perWeekday - 1 >= 0.3) out.push({ kind: "weekend", more: perWeekend / perWeekday - 1 });
  }

  // The 3 days starting on a payday (logged "I got paid") vs. the other days.
  const paydays = recent.filter((e) => e.type === "income").map((e) => dayNumber(e.date));
  if (paydays.length >= 2) {
    const after = new Set<number>();
    for (const p of paydays) for (let i = 0; i < 3; i++) if (p + i >= first && p + i <= last) after.add(p + i);
    const span = last - first + 1;
    const afterSpend = exp.filter((e) => after.has(dayNumber(e.date))).reduce((t, e) => t + e.amount_cents, 0);
    const otherDays = span - after.size;
    if (after.size > 0 && otherDays > 0) {
      const ratio = afterSpend / after.size / ((total - afterSpend) / otherDays || 1);
      if (ratio - 1 >= 0.3) out.push({ kind: "afterPayday", more: ratio - 1 });
    }
  }

  // Biggest category, if it's a large share.
  const byCat = exp.reduce<Record<string, number>>((m, e) => ((m[e.category] = (m[e.category] ?? 0) + e.amount_cents), m), {});
  const [cat, amount] = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  if (amount / total >= 0.35) out.push({ kind: "topCategory", category: cat, share: amount / total });

  return out;
}
