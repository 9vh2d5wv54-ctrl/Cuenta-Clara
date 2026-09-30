import { NextResponse, type NextRequest } from "next/server";
import { writeWeeklyLine } from "@/lib/ai";
import { makeClaraNote, saveClaraNote } from "@/lib/clara-note-server";
import { pushUsers, sendPush } from "@/lib/push";
import { goalMonthlyCents } from "@/lib/budget";
import { cronUnauthorized, monthKeyUTC } from "@/lib/cron";
import { daysBetween, nextDueDate } from "@/lib/dates";
import { appUrl, sendEmail } from "@/lib/email";
import { formatUSD } from "@/lib/money";
import { currencyFor, inCurrency } from "@/lib/currency-scope";
import { loadUserMonth, monthInput, monthTotals } from "@/lib/server-budget";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isSunday6pm, weeklyMode } from "@/lib/weekly-time";

// "Tu resumen / Your week": Sundays at 6 PM. It also writes Clara's weekly note
// for everyone with something to write about (shown on Home), and leads the
// email with it.
// When: Sunday 6 PM in each person's own timezone. The cron runs hourly on Sundays
// and Mondays UTC (vercel.json, needs Vercel Pro); each run handles the people for
// whom it's 6 PM right now. WEEKLY_LOCAL_TIME=false sends to everyone on one run.

// Room for Claude to write many notes in one run.
export const maxDuration = 300;

type Row = {
  id: string;
  email: string;
  language: "es" | "en";
  timezone: string;
  email_weekly_on: boolean;
  subscriptions: { plan: string; status: string; trial_ends_at: string | null } | null;
};

export async function GET(request: NextRequest) {
  const denied = cronUnauthorized(request);
  if (denied) return denied;
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("users")
    .select("id, email, language, timezone, email_weekly_on, subscriptions(plan, status, trial_ends_at)");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const month = monthKeyUTC();
  let sent = 0;
  let notes = 0;
  let pushed = 0;
  const local = weeklyMode() === "local";
  const due = ((data ?? []) as unknown as Row[]).filter((u) => !local || isSunday6pm(u.timezone));
  if (due.length === 0) return NextResponse.json({ sent: 0, notes: 0, pushed: 0, due: 0 });
  const wantsPush = await pushUsers(db, "note");
  let skipped = 0;
  for (const user of due) {
    // A retried or repeated run in the same hour must not send twice.
    if (await noteJustWritten(db, user.id)) {
      skipped++;
      continue;
    }
    await inCurrency(await currencyFor(db, user.id), async () => {
      // Clara's note first: it goes on Home even for people who turned the email off.
      const note = await makeClaraNote(db, user.id, user.language === "en" ? "en" : "es", user.timezone).catch(() => null);
      if (note && (await saveClaraNote(db, user.id, note.week, note.body))) notes++;
      if (note && wantsPush.has(user.id)) {
        pushed += await sendPush(db, user.id, { title: user.language === "en" ? "Clara's note" : "La nota de Clara", body: note.body, url: "/app", tag: "clara-note" });
      }
      if (!user.email_weekly_on) return;

      const u = await loadUserMonth(db, user.id, month);
      if (!u.income) return; // nothing to summarize before setup
      const es = user.language !== "en";
      const totals = monthTotals(u);
      const line = note?.body ?? (await writeWeeklyLine(monthInput(u, user.language, month)));
  
      const now = new Date();
      const dueSoon = u.bills
        .map((b) => ({ b, days: daysBetween(now, nextDueDate(b.due_day, now)) }))
        .filter((x) => x.days <= 7)
        .sort((a, b) => a.days - b.days)
        .map(({ b }) => `${b.name} ${formatUSD(b.amount_cents)} (${es ? "día" : "day"} ${b.due_day})`);
  
      const goals = u.goals.map((g) => {
        const pct = Math.min(100, Math.round((g.saved_cents / g.target_cents) * 100));
        return es
          ? `${g.name}: ${formatUSD(g.saved_cents)} de ${formatUSD(g.target_cents)} (${pct}%), aparta ${formatUSD(goalMonthlyCents(g))} al mes.`
          : `${g.name}: ${formatUSD(g.saved_cents)} of ${formatUSD(g.target_cents)} (${pct}%), set aside ${formatUSD(goalMonthlyCents(g))} a month.`;
      });
  
      const sub = user.subscriptions;
      const neverTried = !sub || (sub.plan === "free" && !sub.trial_ends_at);
  
      const paragraphs = [
        line,
        es ? `Te quedan ${formatUSD(totals.left)} este mes.` : `You have ${formatUSD(totals.left)} left this month.`,
        dueSoon.length
          ? (es ? "Vencen esta semana: " : "Due this week: ") + dueSoon.join(", ") + "."
          : es
            ? "No vence ninguna cuenta esta semana."
            : "No bills due this week.",
        ...goals,
      ];
  
      const ok = await sendEmail({
        to: user.email,
        userId: user.id,
        kind: "weekly",
        subject: es ? `Tu resumen: te quedan ${formatUSD(totals.left)}` : `Your week: ${formatUSD(totals.left)} left`,
        body: {
          lang: user.language,
          paragraphs,
          button: { label: es ? "Ver mi mes" : "See my month", url: appUrl("/app") },
          // PRD: one gentle Plus mention, at the bottom, only for free users who never tried it.
          footnote: neverTried
            ? es
              ? "¿Quieres ver cómo vas a estar en 3 meses? Pocket Recon Plus tiene 7 días gratis."
              : "Want to see where you'll be in 3 months? Pocket Recon Plus has a 7-day free trial."
            : undefined,
        },
      });
      if (ok) sent++;
    });
  }
  return NextResponse.json({ sent, notes, pushed, due: due.length, skipped });
}

/** True when this person's weekly note was written in the last 3 hours (this run already happened). */
async function noteJustWritten(db: ReturnType<typeof supabaseAdmin>, userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 3 * 3600_000).toISOString();
  const { data, error } = await db.from("clara_notes").select("id").eq("user_id", userId).gte("created_at", since).limit(1);
  return !error && (data?.length ?? 0) > 0;
}
