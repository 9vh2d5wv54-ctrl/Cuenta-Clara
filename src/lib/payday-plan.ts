import { goalMonthlyCents, monthlySendCents } from "./budget";
import type { ClaraData } from "./clara-tools";
import { daysInMonth, todayISO } from "./dates";
import { addDays } from "./paycheck";
import { nextPayday } from "./safe-to-spend";
import { taxCents } from "./taxes";
import { PER_YEAR, schedule } from "./what-if";

// "Mañana es día de pago" (Clara reaches out first, MVP PRD). The day before
// payday: what this paycheck needs to cover until the next one, from the plan.
// Two ways to count bills, so a paycheck that lands right before rent isn't
// called "short" when money set aside from the last one is already in the bank:
//   "due": they updated their balance in the last 14 days, so the plan starts from
//          that balance plus the paycheck and takes off the bills actually due
//          before the next payday (full amounts);
//   "share": otherwise, each paycheck covers its share of the month's bills, like
//          paycheck mode, and the bills coming due are listed for the dates.
// Family sends and savings are always this paycheck's share of the month, and the
// tax set-aside (Plus) comes off the paycheck. What's left is for everyday
// spending, spread over the days until the next payday.

export type PaydayPlan = {
  payday: string;
  nextPayday: string;
  days: number;
  paycheck: number;
  /** "due": balance + paycheck − bills due; "share": paycheck − its share of the month's bills. */
  mode: "due" | "share";
  onHand: number | null; // bank balance now, in "due" mode
  billsTotal: number; // what the plan takes off for bills in this mode
  bills: { name: string; amount: number; date: string }[]; // coming due before the next payday
  family: number;
  savings: number;
  taxes: number;
  left: number;
  perDay: number | null;
};

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** The plan for a payday that falls tomorrow, or null (no payday tomorrow, or no income). */
export function paydayPlanTomorrow(d: ClaraData, now = new Date()): PaydayPlan | null {
  const sched = schedule(d, now);
  if (!sched || d.income <= 0) return null;
  const tomorrow = addDays(todayISO(now), 1);
  if (sched.first !== tomorrow) return null;
  return paydayPlan(d, tomorrow, sched.cycle, now);
}

export const FRESH_DAYS = 14;

/** The bank balance now (typed + logged since), if typed in the last FRESH_DAYS days. */
function freshBalance(d: ClaraData, now: Date): number | null {
  const p = d.profile;
  if (p?.balance_cents == null || !p.balance_on) return null;
  const today = todayISO(now);
  if (p.balance_on < addDays(today, -FRESH_DAYS)) return null;
  const since = d.recent
    .filter((e) => e.date > p.balance_on! && e.date <= today)
    .reduce((s, e) => s + (e.type === "income" ? e.amount_cents : -e.amount_cents), 0);
  return p.balance_cents + since;
}

export function paydayPlan(d: ClaraData, payday: string, cycle: keyof typeof PER_YEAR, now = new Date()): PaydayPlan {
  const next = nextPayday(payday, cycle, payday);
  const share = (monthly: number) => Math.round((monthly * 12) / PER_YEAR[cycle]);
  const paycheck = share(d.income);

  const bills: PaydayPlan["bills"] = [];
  for (let day = payday; day < next; day = addDays(day, 1)) {
    const at = parse(day);
    const last = daysInMonth(at.getFullYear(), at.getMonth());
    for (const b of d.bills) if (Math.min(b.due_day, last) === at.getDate()) bills.push({ name: b.name, amount: b.amount_cents, date: day });
  }
  const family = share(d.recipients.reduce((s, r) => s + monthlySendCents(r), 0));
  const savings = share(d.goals.reduce((s, g) => s + goalMonthlyCents(g, parse(payday)), 0));
  const taxes = taxCents(paycheck, d.taxPct);
  const onHand = freshBalance(d, now);
  const mode = onHand === null ? "share" : "due";
  const billsTotal = mode === "due" ? bills.reduce((s, b) => s + b.amount, 0) : share(d.bills.reduce((s, b) => s + b.amount_cents, 0));
  const left = (onHand ?? 0) + paycheck - billsTotal - family - savings - taxes;
  const days = Math.max(1, Math.round((parse(next).getTime() - parse(payday).getTime()) / 86_400_000));
  return {
    payday,
    nextPayday: next,
    days,
    paycheck,
    mode,
    onHand,
    billsTotal,
    bills,
    family,
    savings,
    taxes,
    left,
    perDay: left > 0 ? Math.floor(left / days) : null,
  };
}
