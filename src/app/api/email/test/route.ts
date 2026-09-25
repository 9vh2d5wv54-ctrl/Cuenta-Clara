import { NextResponse } from "next/server";
import * as email from "@/lib/email";
import { supabaseFromCookies } from "@/lib/supabase-server";

// Open /api/email/test while signed in: sends a sample bill reminder to your
// own email and shows what Resend said, so setup problems are visible.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: false, problem: "RESEND_API_KEY is missing" });
  const supabase = await supabaseFromCookies();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return NextResponse.json({ ok: false, problem: "sign in to the app first, then open this page" });

  const { data: profile } = await supabase.from("users").select("language").maybeSingle();
  const lang = profile?.language === "en" ? "en" : "es";
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
