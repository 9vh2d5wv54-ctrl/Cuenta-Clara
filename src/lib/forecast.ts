import { goalMonthlyCents, monthlySendCents } from "./budget";
import { daysInMonth } from "./dates";
import type { Bill, Entry, Goal, Recipient } from "./types";

// Plus: the 3-month forecast ("¿Cómo voy a estar en diciembre?").
// Assumes next months look like this one: same income, bills and sends, goal
// contributions until each goal is reached, and everyday spending at this
// month's pace.

export type ForecastMonth = {
  month: string; // YYYY-MM
  left: number;
  savedTowardGoals: number; // cumulative, from next month on
};

export function spendingPace(monthEntries: Entry[], today = new Date()): number {
  const spent = monthEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount_cents, 0);
  const day = Math.max(1, today.getDate());
  return Math.round((spent / day) * daysInMonth(today.getFullYear(), today.getMonth()));
}

export function forecast(
  incomeCents: number,
  bills: Bill[],
  recipients: Recipient[],
  goals: Goal[],
  monthEntries: Entry[],
  today = new Date(),
  months = 3,
): ForecastMonth[] {
  const billsTotal = bills.reduce((s, b) => s + b.amount_cents, 0);
  const family = recipients.reduce((s, r) => s + monthlySendCents(r), 0);
  const spending = spendingPace(monthEntries, today);

  // Track each goal's balance as the months go by.
  const balances = goals.map((g) => ({ ...g }));
  let saved = 0;
  const out: ForecastMonth[] = [];

  for (let i = 1; i <= months; i++) {
    const at = new Date(today.getFullYear(), today.getMonth() + i, 1);
    let contributions = 0;
    for (const g of balances) {
      const c = Math.min(goalMonthlyCents(g, at), Math.max(0, g.target_cents - g.saved_cents));
      g.saved_cents += c;
      contributions += c;
    }
    saved += contributions;
    out.push({
      month: `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`,
      left: incomeCents - billsTotal - family - contributions - spending,
      savedTowardGoals: saved,
    });
  }
  return out;
}

export function monthName(month: string, locale: string, withYear = false): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale === "es" ? "es-US" : "en-US", {
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  });
}
