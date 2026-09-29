import { NextResponse, type NextRequest } from "next/server";
import { rateBetween, symbolFor } from "@/lib/currencies";
import { cronUnauthorized, longDate, monthKeyUTC } from "@/lib/cron";
import { daysInMonth } from "@/lib/dates";
import { appUrl, sendEmail } from "@/lib/email";
import { formatUSD } from "@/lib/money";
import { currencyFor, inCurrency } from "@/lib/currency-scope";
import { loadUserMonth, monthTotals } from "@/lib/server-budget";
import { supabaseAdmin } from "@/lib/supabase-server";
import { writePaydayLine } from "@/lib/ai";
import { loadClaraData, userNow } from "@/lib/clara-server";
import { paydayEmail, paydayFacts, paydayFallbackLine } from "@/lib/payday-email";
import { paydayPlanTomorrow } from "@/lib/payday-plan";
import { runHealthChecks } from "@/lib/health-check";
import { feedbackRecipient } from "@/lib/feedback";
import { needsNudge, nudgeWindow, welcomeEmail } from "@/lib/welcome-email";

// Daily (vercel.json): a health check of the paid path (emails the owner only when
// something is broken), the next-day welcome nudge for people who didn't finish setup,
// payday plans the day before payday, bill reminders 3 days
// out, trial-ending notices 2 days out, Plus exchange-rate alerts, and Plus tax
// set-aside reminders 7 days before each IRS estimated-tax due date.

type User = {
  id: string;
  email: string;
  language: "es" | "en";
  timezone: string;
  email_bills_on: boolean;
  rate_alert_on: boolean;
  rate_alert_baseline: number | null;
  home_currency: string | null;
};

export async function GET(request: NextRequest) {
  const denied = cronUnauthorized(request);
  if (denied) return denied;
  const db = supabaseAdmin();
  const [bills, trials, rates, taxes, paydays, health, welcome] = await Promise.all([
    billReminders(db),
    trialReminders(db),
    rateAlerts(db),
    taxReminders(db),
    paydayEmails(db),
    healthAlert(db),
    welcomeNudges(db),
  ]);
  return NextResponse.json({ bills, trials, rates, taxes, paydays, health, welcome });
}

/** Yesterday's sign-ups who haven't entered income or a bill: one friendly nudge back to setup. */
async function welcomeNudges(db: ReturnType<typeof supabaseAdmin>) {
  const now = new Date();
  const { from, to } = nudgeWindow(now);
  const { data: users, error } = await db
    .from("users")
    .select("id, email, language, created_at")
    .eq("email_weekly_on", true)
    .gte("created_at", from)
    .lt("created_at", to);
  if (error) return { error: error.message };
  if (!users?.length) return { sent: 0 };
  const ids = users.map((u) => u.id as string);
  const [{ data: budgets }, { data: bills }] = await Promise.all([
    db.from("budgets").select("user_id").in("user_id", ids).gt("income_cents", 0),
    db.from("bills").select("user_id").in("user_id", ids),
  ]);
  const setUp = new Set([...(budgets ?? []), ...(bills ?? [])].map((r) => r.user_id as string));
  const replyTo = feedbackRecipient() ?? undefined;
  let sent = 0;
  for (const u of users as { id: string; email: string; language: string; created_at: string }[]) {
    if (!needsNudge(u, setUp, now)) continue;
    const { subject, body } = welcomeEmail(u.language === "en" ? "en" : "es", appUrl("/app/setup"));
    if (await sendEmail({ to: u.email, userId: u.id, kind: "weekly", subject, body, replyTo })) sent++;
  }
  return { sent };
}

/** Runs the health check and emails the owner the problems, if there are any. */
async function healthAlert(db: ReturnType<typeof supabaseAdmin>) {
  const checks = await runHealthChecks(db);
  const broken = checks.filter((c) => !c.ok);
  const to = feedbackRecipient();
  if (broken.length && to) {
    await sendEmail({
      to,
      userId: "health-check",
      kind: null,
      subject: `Cuenta Clara: ${broken.length} ${broken.length === 1 ? "thing needs" : "things need"} attention`,
      body: {
        lang: "en",
        paragraphs: [
          "Today's automatic check found a problem. If ads are running, pause them until it's fixed.",
          ...broken.map((c) => `✗ ${c.name}: ${c.detail}`),
          "Everything that passed is on the dashboard.",
        ],
        button: { label: "Open the dashboard", url: appUrl("/app/admin") },
      },
    });
  }
  return { ok: checks.length - broken.length, broken: broken.map((c) => c.name) };
}

/** "Mañana es día de pago": the plan for tomorrow's paycheck, to people who get summary emails. */
async function paydayEmails(db: ReturnType<typeof supabaseAdmin>) {
  const { data, error } = await db
    .from("users")
    .select("id, email, language, timezone")
    .eq("email_weekly_on", true)
    .or("payday_anchor.not.is.null,pay_frequency.not.is.null");
  if (error) return { error: error.message };

  let sent = 0;
  for (const user of (data ?? []) as Pick<User, "id" | "email" | "language" | "timezone">[]) {
    await inCurrency(await currencyFor(db, user.id), async () => {
      const now = userNow(user.timezone);
      const { data: money } = await loadClaraData(db, now, user.id);
      const plan = paydayPlanTomorrow(money, now);
      if (!plan) return;
      const lang = user.language === "en" ? "en" : "es";
      const line = await writePaydayLine(paydayFacts(plan, lang), paydayFallbackLine(plan, lang));
      const { subject, body } = paydayEmail(plan, lang, line, appUrl("/app"));
      if (await sendEmail({ to: user.email, userId: user.id, kind: "weekly", subject, body })) sent++;
    });
  }
  return { sent };
}

async function billReminders(db: ReturnType<typeof supabaseAdmin>) {
  const target = new Date();
  target.setUTCDate(target.getUTCDate() + 3);
  const day = target.getUTCDate();
  const lastDay = daysInMonth(target.getUTCFullYear(), target.getUTCMonth());
  // A bill due on the 31st comes due on the last day of a shorter month.
  const dueDays = day === lastDay ? Array.from({ length: 32 - day }, (_, i) => day + i) : [day];

  const { data, error } = await db
    .from("bills")
    .select("id, name, amount_cents, user_id, users!inner(id, email, language, timezone, email_bills_on)")
    .in("due_day", dueDays)
    .eq("reminder_on", true)
    .eq("users.email_bills_on", true);
  if (error) return { error: error.message };

  let sent = 0;
  const month = monthKeyUTC();
  for (const bill of data ?? []) {
    await inCurrency(await currencyFor(db, bill.user_id), async () => {
      const user = bill.users as unknown as User;
      const es = user.language !== "en";
      const left = monthTotals(await loadUserMonth(db, user.id, month)).left;
      const when = longDate(target, user.language, user.timezone);
      const ok = await sendEmail({
        to: user.email,
        userId: user.id,
        kind: "bills",
        subject: es ? `Tu ${bill.name} vence el ${when}` : `Your ${bill.name} is due ${when}`,
        body: {
          lang: user.language,
          paragraphs: es
            ? [
                `${bill.name}: ${formatUSD(bill.amount_cents)}, vence el ${when}.`,
                `Ya está en tu plan. Después de pagarla te siguen quedando ${formatUSD(left)} este mes.`,
              ]
            : [
                `${bill.name}: ${formatUSD(bill.amount_cents)}, due ${when}.`,
                `It's already in your plan. After paying it you still have ${formatUSD(left)} left this month.`,
              ],
          button: {
            label: es ? "Marcar como pagada" : "Mark as paid",
            url: appUrl(`/app/add?type=bill_paid&bill=${bill.id}`),
          },
        },
      });
      if (ok) sent++;
    });
  }
  return { sent };
}

async function trialReminders(db: ReturnType<typeof supabaseAdmin>) {
  const from = new Date(Date.now() + 2 * 86_400_000);
  const to = new Date(Date.now() + 3 * 86_400_000);
  const { data, error } = await db
    .from("subscriptions")
    .select("trial_ends_at, users!inner(id, email, language, timezone)")
    .eq("status", "trialing")
    .eq("cancel_at_period_end", false)
    .gte("trial_ends_at", from.toISOString())
    .lt("trial_ends_at", to.toISOString());
  if (error) return { error: error.message };

  let sent = 0;
  for (const row of data ?? []) {
    const user = row.users as unknown as User;
    const es = user.language !== "en";
    const when = longDate(new Date(row.trial_ends_at!), user.language, user.timezone);
    const ok = await sendEmail({
      to: user.email,
      userId: user.id,
      kind: null,
      subject: es ? `Tu prueba de Plus termina el ${when}` : `Your Plus trial ends ${when}`,
      body: {
        lang: user.language,
        paragraphs: es
          ? [
              `Tu prueba gratis de Cuenta Clara Plus termina el ${when}. Ese día empieza el cobro del plan que elegiste.`,
              "Si no quieres seguir, cancela en Ajustes antes de esa fecha y no se cobra nada. Lo básico sigue gratis.",
            ]
          : [
              `Your free Cuenta Clara Plus trial ends ${when}. The plan you picked starts billing that day.`,
              "If you don't want to continue, cancel in Settings before then and nothing is charged. The basics stay free.",
            ],
        button: { label: es ? "Ir a Ajustes" : "Go to Settings", url: appUrl("/app/ajustes") },
      },
    });
    if (ok) sent++;
  }
  return { sent };
}

async function rateAlerts(db: ReturnType<typeof supabaseAdmin>) {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) return { error: "rates unavailable" };
  const { rates } = (await res.json()) as { rates: Record<string, number> };

  const { data, error } = await db
    .from("users")
    .select("id, email, language, timezone, rate_alert_on, rate_alert_baseline, home_currency, subscriptions!inner(plan, status)")
    .eq("rate_alert_on", true)
    .eq("subscriptions.plan", "plus")
    .in("subscriptions.status", ["trialing", "active"])
    .not("home_currency", "is", null);
  if (error) return { error: error.message };

  let sent = 0;
  for (const user of (data ?? []) as unknown as User[]) {
    const mine = await currencyFor(db, user.id);
    if (user.home_currency === mine) continue;
    const rate = rateBetween(rates, mine, user.home_currency!);
    if (!rate) continue;
    const baseline = user.rate_alert_baseline;
    // Track the low; alert once their currency buys at least 1% more than it.
    if (baseline === null || rate < baseline) {
      await db.from("users").update({ rate_alert_baseline: rate }).eq("id", user.id);
      continue;
    }
    if (rate < baseline * 1.01) continue;

    const es = user.language !== "en";
    const pct = (((rate - baseline) / baseline) * 100).toFixed(1);
    const shown = `1 ${mine} = ${symbolFor(user.home_currency!)} ${rate.toFixed(2)}`;
    const ok = await sendEmail({
      to: user.email,
      userId: user.id,
      kind: "rates",
      subject: es ? `Hoy tu dinero rinde ${pct}% más` : `Your money goes ${pct}% further today`,
      body: {
        lang: user.language,
        paragraphs: es
          ? [`Hoy ${shown}, un ${pct}% mejor que hace unos días.`, "Si tienes un envío pendiente, tu familia recibiría más ahora."]
          : [`Today ${shown}, ${pct}% better than a few days ago.`, "If you have a send coming up, your family would receive more now."],
        button: { label: es ? "Ver mis envíos" : "See my sends", url: appUrl("/app/envios") },
        footnote: "Rates By Exchange Rate API (exchangerate-api.com)",
      },
    });
    if (ok) {
      sent++;
      await db.from("users").update({ rate_alert_baseline: rate }).eq("id", user.id);
    }
  }
  return { sent };
}

async function taxReminders(db: ReturnType<typeof supabaseAdmin>) {
  // Runs 7 days before Apr 15, Jun 15, Sep 15 and Jan 15.
  const target = new Date();
  target.setUTCDate(target.getUTCDate() + 7);
  const isDue = target.getUTCDate() === 15 && [0, 3, 5, 8].includes(target.getUTCMonth());
  if (!isDue) return { sent: 0 };

  const { data, error } = await db
    .from("users")
    .select("id, email, language, timezone, tax_set_aside_pct, subscriptions!inner(plan, status)")
    .not("tax_set_aside_pct", "is", null)
    .eq("email_bills_on", true)
    .eq("subscriptions.plan", "plus")
    .in("subscriptions.status", ["trialing", "active"]);
  if (error) return { error: error.message };

  let sent = 0;
  for (const user of (data ?? []) as unknown as (User & { tax_set_aside_pct: number })[]) {
    // IRS due dates only apply to U.S. accounts.
    if ((await currencyFor(db, user.id)) !== "USD") continue;
    const es = user.language !== "en";
    const when = longDate(target, user.language, "UTC");
    const ok = await sendEmail({
      to: user.email,
      userId: user.id,
      kind: "bills",
      subject: es ? `Tu pago estimado al IRS vence el ${when}` : `Your IRS estimated payment is due ${when}`,
      body: {
        lang: user.language,
        paragraphs: es
          ? [
              `El pago estimado de impuestos al IRS vence el ${when}. Has estado apartando el ${user.tax_set_aside_pct}% de lo que entra para esto.`,
              "En Cuenta Clara ves cuánto llevas apartado. Esto es información general, no asesoría de impuestos: un preparador de impuestos te puede decir cuánto pagar.",
            ]
          : [
              `Your IRS estimated tax payment is due ${when}. You've been setting aside ${user.tax_set_aside_pct}% of what comes in for it.`,
              "Cuenta Clara shows how much you've set aside. This is general information, not tax advice: a tax preparer can tell you how much to pay.",
            ],
        button: { label: es ? "Ver cuánto llevo" : "See what I've set aside", url: appUrl("/app") },
      },
    });
    if (ok) sent++;
  }
  return { sent };
}
