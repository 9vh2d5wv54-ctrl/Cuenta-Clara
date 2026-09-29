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

// "Tu resumen / Your week": Sundays at 6 PM. It also writes Clara's weekly note
// for everyone with something to write about (shown on Home), and leads the
// email with it.
// Default (works on Vercel Hobby): one run Sundays 22:00 UTC, which is 6 PM in
// New York during daylight time, sent to everyone. With WEEKLY_LOCAL_TIME=true
// and the cron set to hourly on Sundays (Vercel Pro), each person gets it at 6 PM
// in their own timezone.

type Row = {
  id: string;
  email: string;
  language: "es" | "en";
  timezone: string;
  email_weekly_on: boolean;
  subscriptions: { plan: string; status: string; trial_ends_at: string | null } | null;
};

function isSunday6pm(timeZone: string, now = new Date()): boolean {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "numeric", hour12: false }).formatToParts(now);
    const weekday = parts.find((p) => p.type === "weekday")?.value;
    const hour = Number(parts.find((p) => p.type === "hour")?.value);
    return weekday === "Sun" && hour === 18;
  } catch {
    return false;
  }
}

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
  const wantsPush = await pushUsers(db, "note");
  for (const user of (data ?? []) as unknown as Row[]) {
    await inCurrency(await currencyFor(db, user.id), async () => {
      if (process.env.WEEKLY_LOCAL_TIME === "true" && !isSunday6pm(user.timezone)) return;
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
              ? "¿Quieres ver cómo vas a estar en 3 meses? Cuenta Clara Plus tiene 7 días gratis."
              : "Want to see where you'll be in 3 months? Cuenta Clara Plus has a 7-day free trial."
            : undefined,
        },
      });
      if (ok) sent++;
    });
  }
  return NextResponse.json({ sent, notes, pushed });
}
