import { summarize } from "./budget";
import { daysInMonth, todayISO } from "./dates";
import { spendingPace } from "./forecast";
import type { Bill, Debt, Entry, Goal, Recipient } from "./types";

// Smart warnings (free): a short "heads up" list on Home, from logged numbers
// only. Most important first, at most three shown.

export type Warning =
  | { kind: "pace"; short: number } // month would end this much under
  | { kind: "rising"; category: string; now: number; more: number } // vs. same point last month
  | { kind: "interest"; name: string; apr: number; monthly: number }
  | { kind: "impulse"; category: string; count: number; total: number }
  | { kind: "fees"; count: number; total: number };

export const HIGH_APR = 20;
const FEES = /\b(fee|fees|overdraft|comisi[oó]n|cargo|sobregiro|penalty|multa|late)\b/i;
const IMPULSE_COUNT = 5;

export function warnings(opts: {
  income: number;
  bills: Bill[];
  recipients: Recipient[];
  goals: Goal[];
  debts: Debt[];
  monthEntries: Entry[];
  recent: Entry[]; // at least since the start of last month
  taxPct?: number;
  now?: Date;
}): Warning[] {
  const now = opts.now ?? new Date();
  const out: Warning[] = [];
  const expenses = opts.monthEntries.filter((e) => e.type === "expense");

  // Pace: if everyday spending keeps this month's pace, where does the month end?
  if (opts.income > 0 && expenses.length > 0 && now.getDate() >= 5) {
    const s = summarize(opts.income, opts.bills, opts.recipients, opts.goals, opts.monthEntries, now, opts.taxPct ?? 0);
    const projected = s.left - (spendingPace(opts.monthEntries, now) - s.spending);
    if (projected < 0) out.push({ kind: "pace", short: -projected });
  }

  // Rising: a category up at least 30% and $50 against the same days of last month.
  const day = now.getDate();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastStart = todayISO(lastMonth);
  const lastEnd = todayISO(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), Math.min(day, daysInMonth(lastMonth.getFullYear(), lastMonth.getMonth()))));
  const byCategory = (list: Entry[]) =>
    list.reduce<Record<string, number>>((m, e) => ((m[e.category] = (m[e.category] ?? 0) + e.amount_cents), m), {});
  const nowBy = byCategory(expenses);
  const thenBy = byCategory(opts.recent.filter((e) => e.type === "expense" && e.date >= lastStart && e.date <= lastEnd));
  const hadLastMonth = Object.keys(thenBy).length > 0;
  if (hadLastMonth) {
    const rising = Object.entries(nowBy)
      .map(([category, total]) => ({ category, now: total, more: total - (thenBy[category] ?? 0) }))
      .filter((r) => r.more >= 5000 && r.more >= 0.3 * (thenBy[r.category] ?? 0))
      .sort((a, b) => b.more - a.more)[0];
    if (rising) out.push({ kind: "rising", ...rising });
  }

  // Expensive debt: the costliest one at a high rate.
  const costly = opts.debts
    .filter((d) => d.balance_cents > 0 && d.apr >= HIGH_APR)
    .map((d) => ({ name: d.name, apr: d.apr, monthly: Math.round((d.balance_cents * d.apr) / 100 / 12) }))
    .sort((a, b) => b.monthly - a.monthly)[0];
  if (costly && costly.monthly >= 1000) out.push({ kind: "interest", ...costly });

  // Fees logged this month.
  const fees = expenses.filter((e) => FEES.test(e.note ?? ""));
  if (fees.length > 0) out.push({ kind: "fees", count: fees.length, total: fees.reduce((t, e) => t + e.amount_cents, 0) });

  // Many small "going out" purchases.
  const fun = expenses.filter((e) => e.category === "fun");
  if (fun.length >= IMPULSE_COUNT) out.push({ kind: "impulse", category: "fun", count: fun.length, total: fun.reduce((t, e) => t + e.amount_cents, 0) });

  return out.slice(0, 3);
}
