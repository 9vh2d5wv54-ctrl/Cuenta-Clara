import type { Bill, Entry, Goal, PayFrequency, Recipient } from "./types";
import { goalMonthlyCents, monthlySendCents } from "./budget";
import { daysInMonth, todayISO } from "./dates";
import { taxCents } from "./taxes";

// Paycheck mode (Plus): plan by paycheck instead of by month, for people paid
// weekly, every two weeks, in cash or by gig.
//
// A pay period starts on the day a paycheck is logged and lasts 7 or 14 days.
// Money that arrives before the period ends (a second gig, tips) joins that period.
// From the period's money we set aside this period's share of bills, family sends
// and savings (a week is 12/52 of a month), and take off what was already spent.
// What's left is what you can spend until payday. Setting aside a share every
// paycheck is what covers rent when it comes due; the bills due before the next
// payday are listed so nothing surprises you.

export const PERIOD_DAYS: Record<PayFrequency, number> = { weekly: 7, biweekly: 14 };

export type PayPeriod = {
  start: string; // YYYY-MM-DD, the first paycheck of the period
  nextPayday: string; // YYYY-MM-DD, start + 7 or 14 days
  daysLeft: number; // until the next payday; 0 or less = payday has come
  paid: number; // every paycheck logged in the period
  /** Bills that come due before the next payday, to show. */
  billsDue: { bill: Bill; date: string }[];
  /** This period's share of every bill. */
  bills: number;
  family: number;
  savings: number;
  /** Tax set-aside (Plus) from this period's pay; 0 when off. */
  taxes: number;
  spent: number;
  left: number;
  /** About how much a day until payday, when there's money left. */
  perDay: number | null;
  /** How much the period's money falls short of what's set aside, if it does. */
  short: number;
};

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

function daysFrom(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}

/** Bills that come due on a day in [start, end). Days past a short month's end land on its last day. */
export function billsDueBetween(bills: Bill[], start: string, end: string): { bill: Bill; date: string }[] {
  const due: { bill: Bill; date: string }[] = [];
  for (let day = start; day < end; day = addDays(day, 1)) {
    const d = parse(day);
    const last = daysInMonth(d.getFullYear(), d.getMonth());
    for (const bill of bills) {
      if (Math.min(bill.due_day, last) === d.getDate()) due.push({ bill, date: day });
    }
  }
  return due;
}

/** The current pay period, or null until the first paycheck is logged. */
export function currentPayPeriod(
  frequency: PayFrequency,
  recent: Entry[],
  bills: Bill[],
  recipients: Recipient[],
  goals: Goal[],
  now = new Date(),
  taxPct = 0,
): PayPeriod | null {
  const today = todayISO(now);
  const length = PERIOD_DAYS[frequency];
  const paychecks = recent
    .filter((e) => e.type === "income" && e.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (paychecks.length === 0) return null;

  // Chain the periods: a paycheck on or after a period's end starts the next one.
  let start = paychecks[0].date;
  let paid = 0;
  for (const p of paychecks) {
    if (p.date >= addDays(start, length)) {
      start = p.date;
      paid = 0;
    }
    paid += p.amount_cents;
  }
  const nextPayday = addDays(start, length);

  // Monthly amounts spread over the year: a week is 12/52 of a month.
  const share = (monthly: number) => Math.round((monthly * 12 * length) / 365);
  const billsTotal = share(bills.reduce((s, b) => s + b.amount_cents, 0));
  const family = share(recipients.reduce((s, r) => s + monthlySendCents(r), 0));
  const savings = share(goals.reduce((s, g) => s + goalMonthlyCents(g, now), 0));
  const spent = recent
    .filter((e) => e.type === "expense" && e.date >= start && e.date <= today)
    .reduce((s, e) => s + e.amount_cents, 0);

  const taxes = taxCents(paid, taxPct);
  const setAside = billsTotal + family + savings + taxes;
  const left = paid - setAside - spent;
  const daysLeft = daysFrom(today, nextPayday);
  return {
    start,
    nextPayday,
    daysLeft,
    paid,
    billsDue: billsDueBetween(bills, start, nextPayday),
    bills: billsTotal,
    family,
    savings,
    taxes,
    spent,
    left,
    perDay: left > 0 && daysLeft > 0 ? Math.floor(left / daysLeft) : null,
    short: Math.max(0, setAside - paid),
  };
}
