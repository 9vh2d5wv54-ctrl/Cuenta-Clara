import { NextResponse, type NextRequest } from "next/server";
import { symbolFor } from "@/lib/currencies";
import { cronUnauthorized, longDate, monthKeyUTC } from "@/lib/cron";
import { daysInMonth } from "@/lib/dates";
import { appUrl, sendEmail } from "@/lib/email";
import { formatUSD } from "@/lib/money";
import { loadUserMonth, monthTotals } from "@/lib/server-budget";
import { supabaseAdmin } from "@/lib/supabase-server";

// Daily (vercel.json): bill reminders 3 days out, trial-ending notices 2 days out,
// and Plus exchange-rate alerts.

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
  const [bills, trials, rates] = await Promise.all([billReminders(db), trialReminders(db), rateAlerts(db)]);
  return NextResponse.json({ bills, trials, rates });
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
    .not("home_currency", "is", null)
    .neq("home_currency", "USD");
  if (error) return { error: error.message };

  let sent = 0;
  for (const user of (data ?? []) as unknown as User[]) {
    const rate = rates[user.home_currency!];
    if (!rate) continue;
    const baseline = user.rate_alert_baseline;
    // Track the low; alert once the dollar buys at least 1% more than it.
    if (baseline === null || rate < baseline) {
      await db.from("users").update({ rate_alert_baseline: rate }).eq("id", user.id);
      continue;
    }
    if (rate < baseline * 1.01) continue;

    const es = user.language !== "en";
    const pct = (((rate - baseline) / baseline) * 100).toFixed(1);
    const shown = `1 USD = ${symbolFor(user.home_currency!)} ${rate.toFixed(2)}`;
    const ok = await sendEmail({
      to: user.email,
      userId: user.id,
      kind: "rates",
      subject: es ? `Hoy tu dólar rinde ${pct}% más` : `Your dollar goes ${pct}% further today`,
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
