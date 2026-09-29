import { currencyFor, inCurrency } from "@/lib/currency-scope";
import { NextResponse, type NextRequest } from "next/server";
import { writePaydayLine } from "@/lib/ai";
import { loadClaraData, userNow } from "@/lib/clara-server";
import * as email from "@/lib/email";
import { paydayEmail, paydayFacts, paydayFallbackLine } from "@/lib/payday-email";
import { paydayPlan } from "@/lib/payday-plan";
import { feedbackRecipient } from "@/lib/feedback";
import { welcomeEmail } from "@/lib/welcome-email";
import { supabaseAdmin, supabaseFromCookies } from "@/lib/supabase-server";
import { makeClaraNote, saveClaraNote } from "@/lib/clara-note-server";
import { isTester } from "@/lib/testers";
import { schedule } from "@/lib/what-if";

// Open /api/email/test while signed in: sends a sample bill reminder to your
// own email and shows what Resend said, so setup problems are visible.
// /api/email/test?kind=payday sends your real payday plan for your next payday.
// /api/email/test?kind=welcome sends the next-day welcome nudge (add &lang=en or es).
// /api/email/test?kind=note writes this week's note from Clara now, saves it (it
// shows on Home) and emails it to you.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabaseForCurrency = await supabaseFromCookies();
  const { data: who } = await supabaseForCurrency.auth.getUser();
  const currency = who.user ? await currencyFor(supabaseForCurrency, who.user.id) : "USD";
  return inCurrency(currency, () => sendTest(request));
}

async function sendTest(request: NextRequest) {
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: false, problem: "RESEND_API_KEY is missing" });
  const supabase = await supabaseFromCookies();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return NextResponse.json({ ok: false, problem: "sign in to the app first, then open this page" });
  // It sends real email and calls Claude, so only tester accounts can use it.
  if (!isTester(data.user.email)) return NextResponse.json({ ok: false, problem: "only for tester accounts (CLARA_TESTER_EMAILS)" }, { status: 403 });

  const { data: profile } = await supabase.from("users").select("language").maybeSingle();
  const lang = profile?.language === "en" ? "en" : "es";

  if (request.nextUrl.searchParams.get("kind") === "welcome") {
    const wantLang = request.nextUrl.searchParams.get("lang");
    const l = wantLang === "en" || wantLang === "es" ? wantLang : lang;
    const { subject, body } = welcomeEmail(l, email.appUrl("/app/setup"));
    const sent = await email.sendEmail({
      to: data.user.email,
      userId: data.user.id,
      kind: "weekly",
      subject: `${l === "es" ? "Prueba" : "Test"}: ${subject}`,
      body,
      replyTo: feedbackRecipient() ?? undefined,
    });
    return NextResponse.json({ ok: sent, sent_to: data.user.email, resend_error: sent ? null : email.lastSendError });
  }

  if (request.nextUrl.searchParams.get("kind") === "note") {
    const { data: tz } = await supabase.from("users").select("timezone").maybeSingle();
    const note = await makeClaraNote(supabase, undefined, lang, (tz as { timezone?: string } | null)?.timezone);
    if (!note) return NextResponse.json({ ok: false, problem: "nothing to write about yet: add your income or log something first" });
    // Saving needs the server key (people can't write notes themselves).
    const saved = await saveClaraNote(supabaseAdmin(), data.user.id, note.week, note.body);
    const sent = await email.sendEmail({
      to: data.user.email,
      userId: data.user.id,
      kind: "weekly",
      subject: lang === "es" ? "Prueba: la nota de Clara" : "Test: Clara's note",
      body: { lang, paragraphs: [note.body], button: { label: lang === "es" ? "Abrir Cuenta Clara" : "Open Cuenta Clara", url: email.appUrl("/app") } },
    });
    return NextResponse.json({
      ok: sent,
      note: note.body,
      written_by_clara: note.ai,
      saved_for_home: saved,
      problem: saved ? null : "couldn't save it: run supabase/migrations/011_clara_notes.sql",
      resend_error: sent ? null : email.lastSendError,
    });
  }

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
