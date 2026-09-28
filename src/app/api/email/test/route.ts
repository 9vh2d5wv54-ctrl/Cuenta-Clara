import { NextResponse, type NextRequest } from "next/server";
import { writePaydayLine } from "@/lib/ai";
import { loadClaraData, userNow } from "@/lib/clara-server";
import * as email from "@/lib/email";
import { paydayEmail, paydayFacts, paydayFallbackLine } from "@/lib/payday-email";
import { paydayPlan } from "@/lib/payday-plan";
import { supabaseFromCookies } from "@/lib/supabase-server";
import { schedule } from "@/lib/what-if";

// Open /api/email/test while signed in: sends a sample bill reminder to your
// own email and shows what Resend said, so setup problems are visible.
// /api/email/test?kind=payday sends your real payday plan for your next payday.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: false, problem: "RESEND_API_KEY is missing" });
  const supabase = await supabaseFromCookies();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return NextResponse.json({ ok: false, problem: "sign in to the app first, then open this page" });

  const { data: profile } = await supabase.from("users").select("language").maybeSingle();
  const lang = profile?.language === "en" ? "en" : "es";

  if (request.nextUrl.searchParams.get("kind") === "payday") {
    const { data: tz } = await supabase.from("users").select("timezone").maybeSingle();
    const now = userNow((tz as { timezone?: string } | null)?.timezone);
    const { data: money } = await loadClaraData(supabase, now);
    const sched = schedule(money, now);
    if (!sched || money.income <= 0) {
      return NextResponse.json({ ok: false, problem: "add your monthly income (Settings) and your payday (Home, Safe to Spend) first" });
    }
    const plan = paydayPlan(money, sched.first, sched.cycle, now);
    const line = await writePaydayLine(paydayFacts(plan, lang), paydayFallbackLine(plan, lang));
    const { subject, body } = paydayEmail(plan, lang, line, email.appUrl("/app"));
    const sent = await email.sendEmail({ to: data.user.email, userId: data.user.id, kind: "weekly", subject: `${lang === "es" ? "Prueba" : "Test"}: ${subject}`, body });
    return NextResponse.json({ ok: sent, sent_to: data.user.email, payday: plan.payday, resend_error: sent ? null : email.lastSendError });
  }

  const ok = await email.sendEmail({
    to: data.user.email,
    userId: data.user.id,
    kind: "bills",
    subject: lang === "es" ? "Prueba: tu luz vence el viernes" : "Test: your power bill is due Friday",
    body: {
      lang,
      paragraphs:
        lang === "es"
          ? ["Esto es una prueba de Cuenta Clara.", "Luz y gas: $120.00, vence el viernes."]
          : ["This is a Cuenta Clara test email.", "Power and gas: $120.00, due Friday."],
      button: { label: lang === "es" ? "Abrir Cuenta Clara" : "Open Cuenta Clara", url: email.appUrl("/app") },
    },
  });
  return NextResponse.json({
    ok,
    sent_to: data.user.email,
    resend_error: ok ? null : email.lastSendError,
  });
}
