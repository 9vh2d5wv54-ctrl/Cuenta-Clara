import { goalMonthlyCents, monthlySendCents } from "./budget";
import { daysInMonth, todayISO } from "./dates";
import { spendingPace } from "./forecast";
import { addDays, currentPayPeriod } from "./paycheck";
import { hasPlus } from "./plan";
import { nextPayday, type PaydayCycle } from "./safe-to-spend";
import { taxCents } from "./taxes";
import type { ClaraData } from "./clara-tools";

// "What if?" (Plus, MVP PRD → Clara): the bank balance day by day for the next
// 90 days, as planned vs. with one decision. Starts from the balance they typed
// (plus what's been logged since) and follows the plan:
//   paychecks on each payday (monthly income spread over the pay cycle),
//   bills on their due days (minus ones marked paid this month),
//   family sends still to go this month today, then on the 1st of each month,
//   savings for goals and the tax set-aside as the plan says,
//   everyday spending at this month's logged pace, spread evenly.
// It's an estimate from their own numbers, not a promise.

export const HORIZON = 90;
export type Scenario = "spend_once" | "save_more_each_month" | "cut_spending_each_month" | "extra_debt_payment_each_month";
export type ChartDay = { date: string; planned: number; withIt: number; bills: { name: string; amount: number }[]; payday: boolean };
export type WhatIfChart = {
  scenario: Scenario;
  label: string; // what the decision is, e.g. "TV", or "$200 more to savings"
  amount: number;
  when: "now" | "next_payday";
  days: ChartDay[]; // today + HORIZON days
  defaultRange: 30 | 60 | 90;
};

export const PER_YEAR: Record<PaydayCycle, number> = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** The pay schedule the plan uses: Safe to Spend's payday, or paycheck mode's. */
export function schedule(d: ClaraData, now: Date): { cycle: PaydayCycle; first: string } | null {
  const p = d.profile;
  const today = todayISO(now);
  if (hasPlus(d.subscription) && p?.pay_frequency) {
    const period = currentPayPeriod(p.pay_frequency, d.recent, d.bills, d.recipients, d.goals, now, d.taxPct);
    if (period && period.daysLeft > 0) return { cycle: p.pay_frequency, first: period.nextPayday };
  }
  if (p?.payday_anchor && p.payday_cycle) return { cycle: p.payday_cycle, first: nextPayday(p.payday_anchor, p.payday_cycle, today) };
  return null;
}

/** Why there's no chart, or null when one can be drawn. */
export function chartMissing(d: ClaraData, now = new Date()): string | null {
  if (d.profile?.balance_cents == null || !d.profile.balance_on) return "no bank balance typed on Home (Safe to Spend card)";
  if (!schedule(d, now)) return "no payday set on Home (Safe to Spend card)";
  if (d.income <= 0) return "no monthly income entered in Settings";
  return null;
}

export function whatIfChart(
  d: ClaraData,
  opts: { scenario: Scenario; amount: number; label: string; when?: "now" | "next_payday" },
  now = new Date(),
): WhatIfChart | null {
  if (chartMissing(d, now)) return null;
  const p = d.profile!;
  const sched = schedule(d, now)!;
  const today = todayISO(now);
  const month = today.slice(0, 7);

  // Where the balance is today: what they typed, plus what's been logged since.
  const sinceTyped = d.recent
    .filter((e) => e.date > p.balance_on! && e.date <= today)
    .reduce((s, e) => s + (e.type === "income" ? e.amount_cents : -e.amount_cents), 0);
  const start = p.balance_cents! + sinceTyped;

  // Paydays in the window, and the paycheck the plan expects.
  const paydays = new Set<string>();
  for (let day = sched.first; day <= addDays(today, HORIZON); day = nextPayday(day, sched.cycle, day)) paydays.add(day);
  const paycheck = Math.round((d.income * 12) / PER_YEAR[sched.cycle]);
  const taxes = taxCents(paycheck, d.taxPct);

  const paidThisMonth = new Set(
    d.recent.filter((e) => e.type === "bill_paid" && e.date.startsWith(month)).map((e) => (e.note ?? "").trim().toLowerCase()),
  );
  const sendsLeftThisMonth = d.recipients.reduce((s, r) => {
    const sent = d.recent
      .filter((e) => e.type === "send" && e.recipient_id === r.id && e.date.startsWith(month))
      .reduce((t, e) => t + e.amount_cents, 0);
    return s + Math.max(0, monthlySendCents(r) - sent);
  }, 0);
  const sendsMonthly = d.recipients.reduce((s, r) => s + monthlySendCents(r), 0);
  const monthEntries = d.recent.filter((e) => e.date.startsWith(month));
  const pace = spendingPace(monthEntries, now); // this month's everyday spending, at the logged pace

  const when = opts.when ?? "now";
  const firstPayday = [...paydays][0];
  const days: ChartDay[] = [];
  let planned = start;
  let delta = 0;
  for (let i = 0; i <= HORIZON; i++) {
    const date = addDays(today, i);
    const at = parse(date);
    const dim = daysInMonth(at.getFullYear(), at.getMonth());
    const firstOfMonth = at.getDate() === 1 && i > 0;
    const isPayday = paydays.has(date);

    const bills = d.bills
      .filter((b) => Math.min(b.due_day, dim) === at.getDate())
      .filter((b) => !(date.startsWith(month) && paidThisMonth.has(b.name.trim().toLowerCase())));
    let flow = -bills.reduce((s, b) => s + b.amount_cents, 0);
    if (isPayday) flow += paycheck - taxes;
    if (i === 0) flow -= sendsLeftThisMonth;
    if (firstOfMonth) flow -= sendsMonthly + d.goals.reduce((s, g) => s + Math.min(goalMonthlyCents(g, at), Math.max(0, g.target_cents - g.saved_cents)), 0);
    if (i > 0) flow -= pace / dim;
    planned += flow;

    if (opts.scenario === "spend_once") {
      if ((when === "now" && i === 0) || (when === "next_payday" && date === firstPayday)) delta -= opts.amount;
    } else if (opts.scenario === "cut_spending_each_month") {
      if (i > 0) delta += opts.amount / dim;
    } else if (firstOfMonth) {
      delta -= opts.amount; // more to savings, or more toward debt, on the 1st of each month
    }

    days.push({
      date,
      planned: Math.round(planned),
      withIt: Math.round(planned + delta),
      bills: bills.map((b) => ({ name: b.name, amount: b.amount_cents })),
      payday: isPayday,
    });
  }
  return {
    scenario: opts.scenario,
    label: opts.label,
    amount: opts.amount,
    when,
    days,
    defaultRange: opts.scenario === "spend_once" ? 30 : 90,
  };
}

/** The lowest balance in the first `range` days, for each line. */
export function lowest(chart: WhatIfChart, range = HORIZON): { planned: ChartDay; withIt: ChartDay } {
  const slice = chart.days.slice(0, range + 1);
  const min = (k: "planned" | "withIt") => slice.reduce((m, x) => (x[k] < m[k] ? x : m), slice[0]);
  return { planned: min("planned"), withIt: min("withIt") };
}
