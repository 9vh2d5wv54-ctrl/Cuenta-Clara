import type { Entry } from "./types";

// Tax set-aside (Plus), for people whose pay has no taxes taken out: 1099
// contractors, cash jobs, gig work. We set aside a percentage of what comes in
// and show the next IRS estimated-tax due date. General information only, never
// tax advice: the person picks the percentage.

export const TAX_OPTIONS = [15, 20, 25, 30] as const;

export function taxCents(incomeCents: number, pct: number): number {
  return pct > 0 ? Math.round((incomeCents * pct) / 100) : 0;
}

/**
 * The IRS estimated-tax period that contains `today`, with its due date.
 * Periods: Jan–Mar → Apr 15, Apr–May → Jun 15, Jun–Aug → Sep 15, Sep–Dec → Jan 15.
 * A due date on a weekend or holiday moves to the next business day; we show the 15th.
 */
export function estimatedTaxPeriod(today = new Date()): { start: string; due: string; months: number } {
  const y = today.getFullYear();
  const m = today.getMonth() + 1; // 1–12
  if (m <= 3) return { start: `${y}-01-01`, due: `${y}-04-15`, months: 3 };
  if (m <= 5) return { start: `${y}-04-01`, due: `${y}-06-15`, months: 2 };
  if (m <= 8) return { start: `${y}-06-01`, due: `${y}-09-15`, months: 3 };
  return { start: `${y}-09-01`, due: `${y + 1}-01-15`, months: 4 };
}

/**
 * About how much has been set aside in this tax period. With paycheck mode, from the
 * pay logged since the period started; otherwise the monthly income times the months
 * so far, this one included.
 */
export function setAsideThisPeriod(
  pct: number,
  opts: { payMode: boolean; recent: Entry[]; monthlyIncome: number },
  today = new Date(),
): number {
  const period = estimatedTaxPeriod(today);
  if (opts.payMode) {
    const paid = opts.recent
      .filter((e) => e.type === "income" && e.date >= period.start)
      .reduce((s, e) => s + e.amount_cents, 0);
    return taxCents(paid, pct);
  }
  const [py, pm] = period.start.split("-").map(Number);
  const monthsSoFar = (today.getFullYear() - py) * 12 + (today.getMonth() + 1 - pm) + 1;
  return taxCents(opts.monthlyIncome, pct) * monthsSoFar;
}
