import { monthlySendCents } from "./budget";
import { daysInMonth, todayISO } from "./dates";
import { addDays, billsDueBetween } from "./paycheck";
import type { Bill, Entry, Recipient } from "./types";

// Safe to Spend (free): start from what's actually in the account, which the
// person types (we never connect to a bank), and take off what's already
// spoken for before the next payday:
//   bills that come due before payday (and aren't marked paid this month),
//   family sends planned for this month that haven't gone out yet,
//   the savings buffer they don't want to touch.
// Entries logged after the day they typed the balance adjust it, so the number
// stays close between updates. Plus adds a day-by-day projection to payday.

export type PaydayCycle = "weekly" | "biweekly" | "semimonthly" | "monthly";
export const PAYDAY_CYCLES: PaydayCycle[] = ["weekly", "biweekly", "semimonthly", "monthly"];

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysFrom(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}

/** The payday after one payday. Semimonthly = the 15th and the last day of the month. */
function nextAfter(iso: string, cycle: PaydayCycle): string {
  const d = parse(iso);
  if (cycle === "weekly") return addDays(iso, 7);
  if (cycle === "biweekly") return addDays(iso, 14);
  if (cycle === "monthly") {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return todayISO(new Date(y, m, Math.min(d.getDate(), daysInMonth(y, m))));
  }
  const last = daysInMonth(d.getFullYear(), d.getMonth());
  if (d.getDate() < 15) return todayISO(new Date(d.getFullYear(), d.getMonth(), 15));
  if (d.getDate() < last) return todayISO(new Date(d.getFullYear(), d.getMonth(), last));
  return todayISO(new Date(d.getFullYear(), d.getMonth() + 1, 15));
}

/** The first payday after today, rolling a past payday forward by the cycle. */
export function nextPayday(anchor: string, cycle: PaydayCycle, today: string): string {
  if (cycle === "monthly") {
    // Same day of the month as the anchor; the 31st lands on a short month's last day.
    const a = parse(anchor);
    for (let i = 0; i < 1000; i++) {
      const y = a.getFullYear();
      const m = a.getMonth() + i;
      const day = todayISO(new Date(y, m, Math.min(a.getDate(), daysInMonth(y, m))));
      if (day > today) return day;
    }
  }
  let day = anchor;
  for (let i = 0; i < 1000 && day <= today; i++) day = nextAfter(day, cycle);
  return day;
}

export type SafeToSpend = {
  today: string;
  payday: string;
  daysToPayday: number;
  typed: number; // the balance they typed
  typedOn: string; // YYYY-MM-DD
  staleDays: number; // days since they typed it
  sinceTyped: number; // logged since then: money in minus money out (can be negative)
  balance: number; // typed + sinceTyped
  billsDue: { bill: Bill; date: string }[];
  bills: number;
  family: number; // planned this month, not sent yet
  buffer: number;
  safe: number;
  perDay: number | null;
};

export function safeToSpend(opts: {
  balance: number;
  balanceOn: string;
  payday: string;
  buffer: number;
  bills: Bill[];
  recipients: Recipient[];
  recent: Entry[]; // entries from at least the start of this month
  now?: Date;
}): SafeToSpend {
  const today = todayISO(opts.now);
  const month = today.slice(0, 7);

  const sinceTyped = opts.recent
    .filter((e) => e.date > opts.balanceOn && e.date <= today)
    .reduce((s, e) => s + (e.type === "income" ? e.amount_cents : -e.amount_cents), 0);
  const balance = opts.balance + sinceTyped;

  // A bill marked paid this month (Log → Paid a bill) doesn't count again.
  const paidThisMonth = new Set(
    opts.recent.filter((e) => e.type === "bill_paid" && e.date.startsWith(month)).map((e) => (e.note ?? "").trim().toLowerCase()),
  );
  const billsDue = billsDueBetween(opts.bills, today, opts.payday).filter(
    (b) => !(b.date.startsWith(month) && paidThisMonth.has(b.bill.name.trim().toLowerCase())),
  );
  const bills = billsDue.reduce((s, b) => s + b.bill.amount_cents, 0);

  const family = opts.recipients.reduce((s, r) => {
    const sent = opts.recent
      .filter((e) => e.type === "send" && e.recipient_id === r.id && e.date.startsWith(month))
      .reduce((t, e) => t + e.amount_cents, 0);
    return s + Math.max(0, monthlySendCents(r) - sent);
  }, 0);

  const safe = balance - bills - family - opts.buffer;
  const daysToPayday = daysFrom(today, opts.payday);
  return {
    today,
    payday: opts.payday,
    daysToPayday,
    typed: opts.balance,
    typedOn: opts.balanceOn,
    staleDays: Math.max(0, daysFrom(opts.balanceOn, today)),
    sinceTyped,
    balance,
    billsDue,
    bills,
    family,
    buffer: opts.buffer,
    safe,
    perDay: safe > 0 && daysToPayday > 0 ? Math.floor(safe / daysToPayday) : null,
  };
}

export type ProjectedDay = { date: string; balance: number; bills: { name: string; amount: number }[] };

/**
 * Plus: the balance each day until payday, if the family sends go out today, each
 * bill leaves on its due date, and the rest is spent evenly. It ends at the buffer.
 */
export function projectToPayday(s: SafeToSpend): ProjectedDay[] {
  const days: ProjectedDay[] = [];
  const spendPerDay = s.daysToPayday > 0 ? Math.max(0, s.safe) / s.daysToPayday : 0;
  let balance = s.balance - s.family;
  for (let i = 0; i < s.daysToPayday; i++) {
    const date = addDays(s.today, i);
    const due = s.billsDue.filter((b) => b.date === date);
    balance -= due.reduce((t, b) => t + b.bill.amount_cents, 0) + spendPerDay;
    days.push({ date, balance: Math.round(balance), bills: due.map((b) => ({ name: b.bill.name, amount: b.bill.amount_cents })) });
  }
  return days;
}
