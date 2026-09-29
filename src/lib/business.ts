import { taxCents } from "./taxes";
import type { Entry } from "./types";

// Business mode: for side hustles, gig work and self-employed pay. People mark
// income and costs as "business"; this adds them up so the app (and Clara) can
// say what the business brought in, what it cost, and what they actually kept.

/** Categories for business costs, on top of the everyday ones. */
export const BUSINESS_CATEGORIES = ["supplies", "equipment", "transport", "phone", "marketing", "fees", "other"] as const;

/** Only income, costs and paid bills can be business; sends and savings are always personal. */
export function canBeBusiness(type: Entry["type"]): boolean {
  return type === "income" || type === "expense" || type === "bill_paid";
}

export type BusinessTotals = {
  income: number;
  costs: number;
  /** income − costs; negative when the business cost more than it made. */
  profit: number;
  count: number;
};

/** Business income, costs and profit for entries whose date starts with `prefix` ("2026-09" or "2026"). */
export function businessTotals(entries: Entry[], prefix: string): BusinessTotals {
  let income = 0;
  let costs = 0;
  let count = 0;
  for (const e of entries) {
    if (!e.business || !e.date.startsWith(prefix) || !canBeBusiness(e.type)) continue;
    count++;
    if (e.type === "income") income += e.amount_cents;
    else costs += e.amount_cents;
  }
  return { income, costs, profit: income - costs, count };
}

/** Business costs by category, biggest first. */
export function costsByCategory(entries: Entry[], prefix: string): { category: string; cents: number }[] {
  const by = new Map<string, number>();
  for (const e of entries) {
    if (!e.business || !e.date.startsWith(prefix) || e.type === "income" || !canBeBusiness(e.type)) continue;
    by.set(e.category, (by.get(e.category) ?? 0) + e.amount_cents);
  }
  return [...by.entries()].map(([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents);
}

/** Tax set-aside on profit (never on a loss). */
export function taxOnProfit(profit: number, pct: number): number {
  return profit > 0 ? taxCents(profit, pct) : 0;
}

/** Business entries from January 1 of the year of `today` (YYYY-MM-DD), newest first. */
export function businessEntries(entries: Entry[], today: string): Entry[] {
  const jan1 = `${today.slice(0, 4)}-01-01`;
  return entries.filter((e) => e.business && e.date >= jan1).sort((a, b) => b.date.localeCompare(a.date));
}

/** The earlier of `daysBack` ago and January 1, so one query covers both the recent window and the year. */
export function loadSince(now: Date, daysBack: number): Date {
  const back = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack);
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return back < jan1 ? back : jan1;
}
