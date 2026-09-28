import type { Debt } from "./types";

// Debt payoff simulator. Free: payoff date and interest with minimum payments,
// and snowball vs. avalanche. Plus: "what if I add $X a month", milestones.
//
// Month by month: interest is added (APR / 12), every debt gets its minimum, and
// in snowball/avalanche the rest of the monthly budget (the sum of the original
// minimums, plus any extra) goes to one target debt. When a debt is paid off, its
// minimum rolls into the next one. General information, not financial advice.

export type Strategy = "minimum" | "snowball" | "avalanche";
export const MAX_MONTHS = 600;

export type DebtResult = { id: string; name: string; paidOffMonth: number | null; interest: number };

export type PayoffPlan = {
  strategy: Strategy;
  months: number | null; // null = never paid off within MAX_MONTHS at these payments
  interest: number; // cents
  debts: DebtResult[];
};

export function simulate(debts: Debt[], strategy: Strategy, extra = 0): PayoffPlan {
  const live = debts
    .filter((d) => d.balance_cents > 0)
    .map((d) => ({ id: d.id, name: d.name, balance: d.balance_cents, rate: d.apr / 100 / 12, min: d.min_payment_cents, apr: d.apr, interest: 0, paidOffMonth: null as number | null }));
  const budget = live.reduce((s, d) => s + d.min, 0) + Math.max(0, extra);

  let month = 0;
  while (live.some((d) => d.balance > 0) && month < MAX_MONTHS) {
    month++;
    for (const d of live) {
      if (d.balance <= 0) continue;
      const i = Math.round(d.balance * d.rate);
      d.balance += i;
      d.interest += i;
    }
    let pool = strategy === "minimum" ? Infinity : budget;
    for (const d of live) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.balance, d.min, pool);
      d.balance -= pay;
      pool -= pay;
    }
    if (strategy !== "minimum") {
      const order = live
        .filter((d) => d.balance > 0)
        .sort((a, b) => (strategy === "avalanche" ? b.apr - a.apr || a.balance - b.balance : a.balance - b.balance || b.apr - a.apr));
      for (const d of order) {
        if (pool <= 0) break;
        const pay = Math.min(d.balance, pool);
        d.balance -= pay;
        pool -= pay;
      }
    }
    for (const d of live) if (d.balance <= 0 && d.paidOffMonth === null) d.paidOffMonth = month;
  }

  const done = live.every((d) => d.balance <= 0);
  return {
    strategy,
    months: done ? month : null,
    interest: live.reduce((s, d) => s + d.interest, 0),
    debts: live.map((d) => ({ id: d.id, name: d.name, paidOffMonth: d.paidOffMonth, interest: d.interest })),
  };
}

/** The first of the month `months` from now, as YYYY-MM. */
export function monthFromNow(months: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() + months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Progress across all debts: paid down from where they started. */
export function progress(debts: Debt[]): { start: number; now: number; paid: number; share: number; paidOff: number } {
  const start = debts.reduce((s, d) => s + Math.max(d.start_balance_cents, d.balance_cents), 0);
  const now = debts.reduce((s, d) => s + d.balance_cents, 0);
  const paid = Math.max(0, start - now);
  return { start, now, paid, share: start > 0 ? paid / start : 0, paidOff: debts.filter((d) => d.balance_cents === 0).length };
}
