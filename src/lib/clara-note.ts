import { businessTotals } from "./business";
import { runClaraTool, type ClaraData } from "./clara-tools";
import { todayISO } from "./dates";
import { formatUSD } from "./money";

// Clara's weekly note: one short, personal note every Sunday. Code picks the
// facts (what changed this week, the business, goals, bills); Clara only puts
// them into words, so every number in the note is one the app computed.

export type ClaraNote = { id: string; week: string; body: string; seen_at: string | null };

/** The Sunday that starts the week containing `now` (YYYY-MM-DD); notes are keyed by it. */
export function noteWeek(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  return todayISO(d);
}

const shift = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return todayISO(new Date(y, m - 1, d + days));
};

/** Everyday spending in the last 7 days vs. the 7 days before, and the top category. */
export function spendingWeek(d: ClaraData, now = new Date()) {
  const today = todayISO(now);
  const weekAgo = shift(today, -7);
  const twoWeeksAgo = shift(today, -14);
  const exp = d.recent.filter((e) => e.type === "expense" && !e.business && e.date <= today);
  const thisWeek = exp.filter((e) => e.date > weekAgo);
  const lastWeek = exp.filter((e) => e.date > twoWeeksAgo && e.date <= weekAgo);
  const sum = (xs: typeof exp) => xs.reduce((s, e) => s + e.amount_cents, 0);
  const byCat = new Map<string, number>();
  for (const e of thisWeek) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount_cents);
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    thisWeek: sum(thisWeek),
    lastWeek: sum(lastWeek),
    count: thisWeek.length,
    lastCount: lastWeek.length,
    top: top ? { category: top[0], cents: top[1] } : null,
  };
}

/** Is there anything to write about? (No note for an empty account.) */
export function hasNoteData(d: ClaraData, now = new Date()): boolean {
  const since = shift(todayISO(now), -30);
  return d.income > 0 || d.recent.some((e) => e.date >= since) || (d.business?.length ?? 0) > 0 || d.goals.length > 0;
}

/**
 * The facts Clara may use, as short lines. Tool outputs are the same ones she
 * uses in chat, already formatted in the person's currency.
 */
export function noteFacts(d: ClaraData, now = new Date()): string[] {
  const links = { lessons: [], words: [] };
  const tool = (name: string) => runClaraTool(name, {}, d, links, "en", now) as Record<string, unknown>;
  const lines: string[] = [`Today: ${todayISO(now)}`];

  const w = spendingWeek(d, now);
  if (w.count > 0 || w.lastCount > 0) {
    const diff = w.thisWeek - w.lastWeek;
    const change = w.lastCount === 0 ? "no spending logged the week before" : diff === 0 ? "the same as the week before" : `${formatUSD(Math.abs(diff))} ${diff < 0 ? "less" : "more"} than the week before (${formatUSD(w.lastWeek)})`;
    lines.push(`Everyday spending logged in the last 7 days: ${formatUSD(w.thisWeek)}, ${change}.`);
    if (w.top) lines.push(`Biggest category this week: ${w.top.category} (${formatUSD(w.top.cents)}).`);
  } else {
    lines.push("Nothing logged in the last 2 weeks.");
  }

  const month = tool("get_month_summary");
  if (month.available !== false) {
    lines.push(`Left this month (after bills, sends, savings${month.tax_set_aside ? ", taxes" : ""} and spending): ${month.left_this_month}${month.over_budget ? " (over budget)" : ""}.`);
    const due = (month.bills_due_next_14_days as { name: string; amount: string; due: string }[] | undefined) ?? [];
    if (due.length) lines.push(`Bills due in the next 14 days: ${due.map((b) => `${b.name} ${b.amount} (${b.due})`).join(", ")}.`);
  }

  const sts = tool("get_safe_to_spend");
  if (sts.available !== false && sts.safe_to_spend_until_payday) lines.push(`Safe to Spend until payday (${sts.next_payday}): ${sts.safe_to_spend_until_payday}.`);

  const biz = tool("get_business");
  if (biz.available !== false && biz.this_month) {
    const m = biz.this_month as { income: string; costs: string; profit: string; lost_money: boolean };
    const y = biz.this_year_so_far as { profit: string };
    lines.push(`Business this month: came in ${m.income}, costs ${m.costs}, ${m.lost_money ? "lost" : "kept"} ${m.profit.replace("−", "")}. This year so far kept: ${y.profit}.`);
    if (biz.tax_set_aside_on_profit_this_year) lines.push(`Tax set-aside on this year's business profit (${biz.tax_set_aside_percent}%): ${biz.tax_set_aside_on_profit_this_year}.`);
  }

  const goals = tool("get_goals");
  const open = ((goals.goals as { name: string; saved: string; target: string; still_to_save: string; monthly_in_plan: string; done: boolean }[] | undefined) ?? []).filter((g) => !g.done);
  if (open.length) {
    const g = open[0];
    lines.push(`Goal "${g.name}": ${g.saved} saved of ${g.target}, ${g.still_to_save} to go, ${g.monthly_in_plan} a month in the plan.`);
  }
  return lines;
}

/** A plain note from the same numbers, used when Claude isn't reachable (and in demo mode). */
export function fallbackNote(d: ClaraData, lang: "es" | "en", now = new Date()): string {
  const es = lang === "es";
  const w = spendingWeek(d, now);
  const parts: string[] = [];
  const month = businessTotals(d.business ?? [], todayISO(now).slice(0, 7));
  if (d.profile?.business_on && month.count > 0) {
    parts.push(
      month.profit >= 0
        ? es
          ? `Este mes tu negocio te ha dejado ${formatUSD(month.profit)}.`
          : `Your business has kept you ${formatUSD(month.profit)} so far this month.`
        : es
          ? `Este mes tu negocio va ${formatUSD(-month.profit)} por debajo.`
          : `Your business is ${formatUSD(-month.profit)} behind so far this month.`,
    );
  }
  if (w.count > 0 && w.lastCount > 0 && w.thisWeek !== w.lastWeek) {
    const less = w.thisWeek < w.lastWeek;
    const diff = formatUSD(Math.abs(w.thisWeek - w.lastWeek));
    parts.push(
      es
        ? `Esta semana gastaste ${formatUSD(w.thisWeek)} en el día a día, ${diff} ${less ? "menos" : "más"} que la semana anterior.`
        : `You spent ${formatUSD(w.thisWeek)} on everyday things this week, ${diff} ${less ? "less" : "more"} than the week before.`,
    );
  } else if (w.count > 0) {
    parts.push(es ? `Esta semana anotaste ${formatUSD(w.thisWeek)} en gastos del día a día.` : `You logged ${formatUSD(w.thisWeek)} of everyday spending this week.`);
  }
  if (parts.length === 0) {
    return es
      ? "Esta semana no anotaste gastos. Anota lo que gastes estos días y el próximo domingo te digo cómo vas."
      : "Nothing logged this week. Log what you spend over the next few days and next Sunday I'll tell you how it's going.";
  }
  parts.push(es ? "Esta semana, anota cada gasto el mismo día para que tus números sigan claros." : "This week, log each purchase the same day so your numbers stay clear.");
  return parts.join(" ");
}
