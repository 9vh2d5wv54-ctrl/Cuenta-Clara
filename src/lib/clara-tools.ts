import type Anthropic from "@anthropic-ai/sdk";
import { goalMonthlyCents, summarize } from "./budget";
import { todayISO } from "./dates";
import { monthFromNow, simulate, type Strategy } from "./debts";
import { forecast } from "./forecast";
import { WORDS } from "./glossary";
import { LESSONS } from "./lessons";
import { formatUSD } from "./money";
import { currentPayPeriod } from "./paycheck";
import { hasPlus } from "./plan";
import { nextPayday, safeToSpend } from "./safe-to-spend";
import type { Bill, Debt, Entry, Goal, Profile, Recipient, Subscription } from "./types";
import { chartMissing, lowest, whatIfChart, type Scenario, type WhatIfChart } from "./what-if";

// Clara's tools (MVP PRD → "Clara, the AI money copilot"). Golden rule: the app
// does the math, Clara explains it. Every number she says comes from one of
// these functions, already formatted, so she never adds or subtracts herself.

export type ClaraData = {
  profile: Pick<
    Profile,
    "balance_cents" | "balance_on" | "buffer_cents" | "payday_anchor" | "payday_cycle" | "pay_frequency" | "currency"
  > | null;
  income: number; // monthly, cents (0 = not set)
  bills: Bill[];
  recipients: Recipient[];
  goals: Goal[];
  recent: Entry[]; // at least from the start of this month
  debts: Debt[];
  subscription: Subscription | null;
  taxPct: number;
};

/** What the page shows next to the answer: lessons and words Clara pointed to. */
export type ClaraLinks = {
  lessons: { slug: string; title: string }[];
  words: { id: string; term: string }[];
  /** "What if?" chart (Plus) for the last purchase or what-if Clara checked. */
  chart?: WhatIfChart;
};

const usd = (cents: number) => formatUSD(cents);
const toCents = (dollars: unknown) => Math.round(Math.max(0, Number(dollars) || 0) * 100);

const EMPTY = { type: "object" as const, properties: {}, required: [], additionalProperties: false };

export const CLARA_TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "get_month_summary",
    description:
      "This month's plan from the person's own numbers: monthly income, bills, family sends, savings for goals, tax set-aside, everyday spending logged so far, and what's left this month. Also lists bills due in the next 14 days. Call this for any question about their month or what's left.",
    input_schema: EMPTY,
    strict: true,
  },
  {
    name: "get_safe_to_spend",
    description:
      "Safe to Spend: what they can spend until their next payday, starting from the bank balance they typed, minus bills due before payday, family sends not sent yet, and the cushion they keep. Also what would be left on payday if they spend nothing extra. Returns available=false with the reason if they haven't typed a balance or payday yet.",
    input_schema: EMPTY,
    strict: true,
  },
  {
    name: "check_purchase",
    description:
      "Can they afford a one-time purchase? Give the price in dollars. Returns yes / tight / no, decided by code, with the numbers before and after (using Safe to Spend when set up, otherwise what's left this month). Use for every \"¿Me alcanza…?\" / \"Can I afford…?\" question that includes a price. If they didn't say the price, ask for it instead of calling.",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Price in U.S. dollars, e.g. 600 or 79.99" },
        what: { type: "string", description: "What they want to buy in 1-3 words, e.g. \"TV\". Empty string if they didn't say." },
      },
      required: ["amount", "what"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "what_if",
    description:
      "\"What if?\" for a monthly change or a one-time purchase. Scenarios: spend_once (a one-time purchase: this month and until payday), save_more_each_month (put this much more toward savings every month), cut_spending_each_month (spend this much less every month), extra_debt_payment_each_month (pay this much more toward debts every month: payoff date and interest saved). Returns before vs. after numbers computed by code, and the lowest balance ahead with and without the decision. The app draws a 30/60/90-day chart from the same numbers under your answer.",
    input_schema: {
      type: "object",
      properties: {
        scenario: {
          type: "string",
          enum: ["spend_once", "save_more_each_month", "cut_spending_each_month", "extra_debt_payment_each_month"],
        },
        amount: { type: "number", description: "Amount in U.S. dollars" },
        when: {
          type: "string",
          enum: ["now", "next_payday"],
          description: "For spend_once: buy it now, or wait until the next payday. Use now unless they ask about waiting. Ignored for monthly scenarios.",
        },
        what: { type: "string", description: "The item or decision in 1-3 words, e.g. \"TV\" or \"more to savings\". Empty string if they didn't say what it is." },
      },
      required: ["scenario", "amount", "when", "what"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "get_debts",
    description:
      "Their debts (cards and loans they entered): balance, APR, minimum payment, and when they'd be paid off with minimum payments, snowball and avalanche, with total interest for each.",
    input_schema: EMPTY,
    strict: true,
  },
  {
    name: "get_goals",
    description: "Their savings goals: target, saved so far, what's left, target date and the monthly amount the plan sets aside.",
    input_schema: EMPTY,
    strict: true,
  },
  {
    name: "suggest_lesson",
    description:
      "Link one of Cuenta Clara Academy's 2-minute lessons under your answer. Call it when a concept comes up. Lessons: " +
      LESSONS.map((l) => `${l.slug} = ${l.en.title}`).join("; "),
    input_schema: {
      type: "object",
      properties: { slug: { type: "string", enum: LESSONS.map((l) => l.slug) } },
      required: ["slug"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "define_word",
    description:
      "The plain-language definition of a money word from the app's dictionary, and a link to it under your answer. Words: " +
      WORDS.map((w) => `${w.id} = ${w.en.term}`).join("; "),
    input_schema: {
      type: "object",
      properties: { id: { type: "string", enum: WORDS.map((w) => w.id) } },
      required: ["id"],
      additionalProperties: false,
    },
    strict: true,
  },
];

function monthEntries(d: ClaraData, today: string): Entry[] {
  const month = today.slice(0, 7);
  return d.recent.filter((e) => e.date.startsWith(month));
}

function payday(d: ClaraData, now: Date): string | null {
  const today = todayISO(now);
  const p = d.profile;
  // Paycheck mode (Plus) knows the payday from the last paycheck; otherwise use theirs.
  if (hasPlus(d.subscription) && p?.pay_frequency) {
    const period = currentPayPeriod(p.pay_frequency, d.recent, d.bills, d.recipients, d.goals, now, d.taxPct);
    if (period && period.daysLeft > 0) return period.nextPayday;
  }
  return p?.payday_anchor && p.payday_cycle ? nextPayday(p.payday_anchor, p.payday_cycle, today) : null;
}

function safe(d: ClaraData, now: Date) {
  const p = d.profile;
  const day = payday(d, now);
  if (p?.balance_cents == null || !p.balance_on || !day) return null;
  return safeToSpend({
    balance: p.balance_cents,
    balanceOn: p.balance_on,
    payday: day,
    buffer: p.buffer_cents ?? 0,
    bills: d.bills,
    recipients: d.recipients,
    recent: d.recent,
    now,
  });
}

function upcomingBills(d: ClaraData, now: Date, days: number) {
  const out: { name: string; amount: string; due: string }[] = [];
  for (let i = 0; i < days; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const last = new Date(at.getFullYear(), at.getMonth() + 1, 0).getDate();
    for (const b of d.bills) {
      if (Math.min(b.due_day, last) === at.getDate()) out.push({ name: b.name, amount: usd(b.amount_cents), due: todayISO(at) });
    }
  }
  return out;
}

function verdict(after: number, income: number): "yes" | "tight" | "no" {
  if (after < 0) return "no";
  // Less than about a week of a typical month's income left over counts as tight.
  return after < Math.max(5_000, Math.round(income * 0.05)) ? "tight" : "yes";
}

function monthSummary(d: ClaraData, now: Date) {
  const today = todayISO(now);
  const s = summarize(d.income, d.bills, d.recipients, d.goals, monthEntries(d, today), now, d.taxPct);
  return { s, today };
}


function chartSummary(d: ClaraData, links: ClaraLinks, now: Date, opts: { scenario: Scenario; amount: number; label: string; when?: "now" | "next_payday" }) {
  const chart = whatIfChart(d, opts, now);
  if (!chart) return { chart: `not available: ${chartMissing(d, now)}` };
  links.chart = chart;
  const low = lowest(chart);
  const month = todayISO(now).slice(0, 7);
  const gaps = [
    ...(d.bills.length === 0 ? ["No bills are entered (Settings → Bills)."] : []),
    ...(!d.recent.some((e) => e.type === "expense" && e.date.startsWith(month)) ? ["No everyday spending is logged this month (Log)."] : []),
  ];
  const at = (i: number) => chart.days[Math.min(i, chart.days.length - 1)];
  return {
    chart: "shown under your answer (a Plus feature for free users: don't mention it)",
    lowest_balance_next_90_days: {
      as_planned: { balance: usd(low.planned.planned), date: low.planned.date },
      with_this: { balance: usd(low.withIt.withIt), date: low.withIt.date },
    },
    balance_in_30_days: { as_planned: usd(at(30).planned), with_this: usd(at(30).withIt) },
    balance_in_90_days: { as_planned: usd(at(90).planned), with_this: usd(at(90).withIt) },
    projection_assumes: "Paychecks from their monthly income on each payday, bills on due dates, sends and savings as planned, everyday spending at this month's logged pace.",
    ...(gaps.length ? { missing_data: `${gaps.join(" ")} So the balances ahead are likely too high; say so briefly and suggest adding them.` } : {}),
  };
}

export function runClaraTool(name: string, input: Record<string, unknown>, d: ClaraData, links: ClaraLinks, lang: "es" | "en", now = new Date()): unknown {
  switch (name) {
    case "get_month_summary": {
      const { s, today } = monthSummary(d, now);
      if (d.income <= 0) {
        return { available: false, reason: "No monthly income entered yet. They can add it in Settings → Monthly income." };
      }
      return {
        today,
        monthly_income: usd(s.income),
        bills: usd(s.bills),
        family_sends: usd(s.family),
        savings_for_goals: usd(s.savings),
        ...(s.taxes > 0 ? { tax_set_aside: usd(s.taxes) } : {}),
        everyday_spending_so_far: usd(s.spending),
        left_this_month: usd(s.left),
        over_budget: s.left < 0,
        bills_due_next_14_days: upcomingBills(d, now, 14),
      };
    }
    case "get_safe_to_spend": {
      const r = safe(d, now);
      if (!r) {
        return {
          available: false,
          reason: "They haven't typed their bank balance and next payday yet. They can set it up on Home in the Safe to Spend card.",
        };
      }
      return {
        today: r.today,
        next_payday: r.payday,
        days_to_payday: r.daysToPayday,
        bank_balance_now: usd(r.balance),
        balance_typed_days_ago: r.staleDays,
        bills_due_before_payday: r.billsDue.map((b) => ({ name: b.bill.name, amount: usd(b.bill.amount_cents), due: b.date })),
        family_sends_still_to_go: usd(r.family),
        cushion_kept: usd(r.buffer),
        safe_to_spend_until_payday: usd(r.safe),
        per_day: r.perDay === null ? null : usd(r.perDay),
        left_on_payday_if_no_extra_spending: usd(r.safe + r.buffer),
        note: r.staleDays > 3 ? "The balance was typed a while ago; suggest updating it for a sharper number." : undefined,
      };
    }
    case "check_purchase": {
      const amount = toCents(input.amount);
      if (amount <= 0) return { error: "Ask for the price first." };
      const r = safe(d, now);
      const { s } = monthSummary(d, now);
      if (r) {
        const after = r.safe - amount;
        return {
          what: String(input.what ?? ""),
          price: usd(amount),
          answer: verdict(after, d.income),
          ...chartSummary(d, links, now, { scenario: "spend_once", amount, label: String(input.what ?? ""), when: "now" }),
          based_on: "Safe to Spend until payday",
          safe_to_spend_now: usd(r.safe),
          safe_to_spend_after: usd(after),
          next_payday: r.payday,
          bills_due_before_payday: r.billsDue.map((b) => ({ name: b.bill.name, amount: usd(b.bill.amount_cents), due: b.date })),
          short_by: after < 0 ? usd(-after) : null,
        };
      }
      if (d.income <= 0) {
        return { available: false, reason: "No income or balance entered yet, so there's nothing to check against. Ask them to add their monthly income in Settings or their balance on Home." };
      }
      const after = s.left - amount;
      return {
        what: String(input.what ?? ""),
        price: usd(amount),
        answer: verdict(after, d.income),
        based_on: "What's left in this month's plan (Safe to Spend isn't set up)",
        left_this_month_now: usd(s.left),
        left_this_month_after: usd(after),
        short_by: after < 0 ? usd(-after) : null,
      };
    }
    case "what_if": {
      const amount = toCents(input.amount);
      const scenario = String(input.scenario);
      if (amount <= 0) return { error: "Ask for the amount first." };
      const { s, today } = monthSummary(d, now);
      const label = String(input.what ?? "");
      const when = input.when === "next_payday" ? "next_payday" : "now";
      const chart = () => chartSummary(d, links, now, { scenario: scenario as Scenario, amount, label, when });
      if (scenario === "spend_once") {
        const r = safe(d, now);
        return {
          ...chart(),
          when,
          scenario,
          amount: usd(amount),
          left_this_month: { as_planned: usd(s.left), with_this: usd(s.left - amount) },
          ...(r
            ? {
                safe_to_spend_until_payday: { as_planned: usd(r.safe), with_this: usd(r.safe - amount) },
                next_payday: r.payday,
                answer: verdict(r.safe - amount, d.income),
              }
            : { answer: verdict(s.left - amount, d.income) }),
        };
      }
      if (scenario === "save_more_each_month" || scenario === "cut_spending_each_month") {
        if (d.income <= 0) return { available: false, reason: "No monthly income entered yet." };
        const sign = scenario === "save_more_each_month" ? -1 : 1;
        const months = forecast(d.income, d.bills, d.recipients, d.goals, monthEntries(d, today), now, 3, d.taxPct);
        return {
          ...chart(),
          scenario,
          amount_each_month: usd(amount),
          left_each_month: months.map((m) => ({ month: m.month, as_planned: usd(m.left), with_this: usd(m.left + sign * amount) })),
          [scenario === "save_more_each_month" ? "extra_saved" : "money_freed_up"]: {
            in_3_months: usd(amount * 3),
            in_6_months: usd(amount * 6),
            in_12_months: usd(amount * 12),
          },
          assumes: "Next months look like this one: same income, bills and sends, and spending at this month's pace.",
        };
      }
      if (scenario === "extra_debt_payment_each_month") {
        const live = d.debts.filter((x) => x.balance_cents > 0);
        if (live.length === 0) return { available: false, reason: "No debts entered. They can add them in Goals → Debt payoff plan." };
        const base = simulate(live, "avalanche", 0);
        const plan = simulate(live, "avalanche", amount);
        return {
          ...chart(),
          scenario,
          extra_each_month: usd(amount),
          strategy: "avalanche (highest APR first)",
          as_planned: { debt_free: base.months === null ? "not at these payments" : monthFromNow(base.months, now), months: base.months, interest: usd(base.interest) },
          with_this: { debt_free: plan.months === null ? "not at these payments" : monthFromNow(plan.months, now), months: plan.months, interest: usd(plan.interest) },
          interest_saved: usd(Math.max(0, base.interest - plan.interest)),
          months_sooner: base.months !== null && plan.months !== null ? base.months - plan.months : null,
        };
      }
      return { error: "Unknown scenario." };
    }
    case "get_debts": {
      const live = d.debts.filter((x) => x.balance_cents > 0);
      if (live.length === 0) return { available: false, reason: "No debts entered. They can add them in Goals → Debt payoff plan." };
      const plans = (["minimum", "snowball", "avalanche"] as Strategy[]).map((st) => {
        const p = simulate(live, st);
        return { strategy: st, debt_free: p.months === null ? "not at these payments" : monthFromNow(p.months, now), months: p.months, total_interest: usd(p.interest) };
      });
      return {
        debts: live.map((x) => ({ name: x.name, balance: usd(x.balance_cents), apr_percent: x.apr, minimum_payment: usd(x.min_payment_cents) })),
        total_balance: usd(live.reduce((t, x) => t + x.balance_cents, 0)),
        plans,
      };
    }
    case "get_goals": {
      if (d.goals.length === 0) return { available: false, reason: "No savings goals yet. They can add one in Goals." };
      return {
        goals: d.goals.map((g) => ({
          name: g.name,
          target: usd(g.target_cents),
          saved: usd(g.saved_cents),
          still_to_save: usd(Math.max(0, g.target_cents - g.saved_cents)),
          target_date: g.target_date,
          monthly_in_plan: usd(goalMonthlyCents(g, now)),
          done: g.saved_cents >= g.target_cents,
        })),
      };
    }
    case "suggest_lesson": {
      const lesson = LESSONS.find((l) => l.slug === input.slug);
      if (!lesson) return { error: "Unknown lesson." };
      if (!links.lessons.some((l) => l.slug === lesson.slug)) links.lessons.push({ slug: lesson.slug, title: lesson[lang].title });
      return { linked: true, title: lesson[lang].title, summary: lesson[lang].summary };
    }
    case "define_word": {
      const word = WORDS.find((w) => w.id === input.id);
      if (!word) return { error: "Unknown word." };
      if (!links.words.some((w) => w.id === word.id)) links.words.push({ id: word.id, term: word[lang].term });
      return { linked: true, term: word[lang].term, definition: word[lang].def, example: word[lang].example ?? null };
    }
    default:
      return { error: `Unknown tool ${name}.` };
  }
}
