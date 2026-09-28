import { summarize } from "./budget";
import type { Bill, Debt, Entry, Goal, Recipient } from "./types";

// Money Health Score (free), 0–100. Not a credit score: it's how the month and
// the cushion look from the person's own numbers. Four parts, 25 points each,
// each a straight line between a "0 points" and a "full points" mark:
//
//   emergency  months of fixed costs (bills + family sends) saved:   0 → 3 months
//   debt       monthly debt minimums as a share of income:        50% → 10% or less
//   savings    monthly goal contributions as a share of income:     0 → 15%
//   room       what's left after everything and debt minimums, share of income: 0 → 10%
//
// Emergency savings = goals named like an emergency fund + the Safe to Spend cushion.

export type Part = "emergency" | "debt" | "savings" | "room";
export const PART_POINTS = 25;

export type HealthScore = {
  score: number;
  parts: { part: Part; points: number; value: number }[]; // value: months for emergency, share (0–1) otherwise
  weakest: Part;
};

const EMERGENCY = /emerg|colch[oó]n|fondo|imprevist|rainy|cushion|safety/i;

function line(value: number, zeroAt: number, fullAt: number): number {
  const t = (value - zeroAt) / (fullAt - zeroAt);
  return Math.round(Math.max(0, Math.min(1, t)) * PART_POINTS);
}

export function healthScore(opts: {
  income: number;
  bills: Bill[];
  recipients: Recipient[];
  goals: Goal[];
  debts: Debt[];
  monthEntries: Entry[];
  buffer: number;
  taxPct?: number;
  now?: Date;
}): HealthScore | null {
  if (opts.income <= 0) return null;
  const s = summarize(opts.income, opts.bills, opts.recipients, opts.goals, opts.monthEntries, opts.now, opts.taxPct ?? 0);

  const fixed = s.bills + s.family;
  const saved = opts.goals.filter((g) => EMERGENCY.test(g.name)).reduce((t, g) => t + g.saved_cents, 0) + opts.buffer;
  const months = fixed > 0 ? saved / fixed : saved > 0 ? 3 : 0;
  const minimums = opts.debts.filter((d) => d.balance_cents > 0).reduce((t, d) => t + d.min_payment_cents, 0);
  const debtShare = minimums / opts.income;
  const savingsShare = s.savings / opts.income;
  // Debt minimums aren't in the monthly plan unless listed as bills; count them here.
  const roomShare = (s.left - minimums) / opts.income;

  const parts: HealthScore["parts"] = [
    { part: "emergency", points: line(months, 0, 3), value: months },
    { part: "debt", points: line(debtShare, 0.5, 0.1), value: debtShare },
    { part: "savings", points: line(savingsShare, 0, 0.15), value: savingsShare },
    { part: "room", points: line(roomShare, 0, 0.1), value: roomShare },
  ];
  const weakest = [...parts].sort((a, b) => a.points - b.points)[0].part;
  return { score: parts.reduce((t, p) => t + p.points, 0), parts, weakest };
}
