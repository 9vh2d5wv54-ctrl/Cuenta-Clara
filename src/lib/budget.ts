import type { Bill, Entry, Goal, Recipient } from "./types";
import { monthsUntil } from "./dates";

// "What's left" = income − bills − planned sends − goal contributions − logged expenses.
// Bills, sends and goal contributions count at their planned amounts, so logging a
// send or a paid bill marks it done without counting it twice. Only everyday
// expenses come off on top of the plan.

export function monthlySendCents(r: Recipient): number {
  return r.frequency === "biweekly" ? r.default_amount_cents * 2 : r.default_amount_cents;
}

export function goalMonthlyCents(g: Goal, from = new Date()): number {
  const remaining = Math.max(0, g.target_cents - g.saved_cents);
  if (remaining === 0) return 0;
  return Math.ceil(remaining / monthsUntil(g.target_date, from));
}

export type MonthSummary = {
  income: number;
  bills: number;
  family: number;
  savings: number;
  spending: number;
  left: number;
};

export function summarize(
  incomeCents: number,
  bills: Bill[],
  recipients: Recipient[],
  goals: Goal[],
  monthEntries: Entry[],
  from = new Date(),
): MonthSummary {
  const billsTotal = bills.reduce((s, b) => s + b.amount_cents, 0);
  const family = recipients.reduce((s, r) => s + monthlySendCents(r), 0);
  const savings = goals.reduce((s, g) => s + goalMonthlyCents(g, from), 0);
  const spending = monthEntries
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + e.amount_cents, 0);
  return {
    income: incomeCents,
    bills: billsTotal,
    family,
    savings,
    spending,
    left: incomeCents - billsTotal - family - savings - spending,
  };
}

export const EXPENSE_CATEGORIES = [
  "food",
  "transport",
  "home",
  "health",
  "phone",
  "kids",
  "fun",
  "other",
] as const;
