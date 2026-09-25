import { NextResponse, type NextRequest } from "next/server";
import { verifyUnsubscribe, type EmailKind } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase-server";

// One-click unsubscribe. GET is the link in the email footer; POST is what mail
// apps send for the List-Unsubscribe-Post header (RFC 8058).
const COLUMN: Record<EmailKind, string> = {
  weekly: "email_weekly_on",
  bills: "email_bills_on",
  rates: "rate_alert_on",
};

async function unsubscribe(request: NextRequest): Promise<{ ok: boolean; lang: "es" | "en" }> {
  const q = request.nextUrl.searchParams;
  const userId = q.get("u") ?? "";
  const kind = q.get("k") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(userId) || !verifyUnsubscribe(userId, kind, q.get("s") ?? "")) {
    return { ok: false, lang: "es" };
  }
  const { data } = await supabaseAdmin()
    .from("users")
    .update({ [COLUMN[kind]]: false })
    .eq("id", userId)
    .select("language")
    .maybeSingle();
  return { ok: true, lang: data?.language === "en" ? "en" : "es" };
}

export async function POST(request: NextRequest) {
  const { ok } = await unsubscribe(request);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}

export async function GET(request: NextRequest) {
  const { ok, lang } = await unsubscribe(request);
  const msg = ok
    ? lang === "es"
      ? "Listo. Ya no te mandamos ese correo. Puedes volver a activarlo en Ajustes."
      : "Done. You won't get that email anymore. You can turn it back on in Settings."
    : lang === "es"
      ? "Este enlace no es válido. Cambia tus correos desde Ajustes."
      : "This link isn't valid. Change your emails from Settings.";
  const html = `<!doctype html><html lang="${lang}"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cuenta Clara</title>
<body style="margin:0;background:#f8f8f4;color:#1c2826;font-family:system-ui,sans-serif"><main style="max-width:480px;margin:0 auto;padding:48px 16px">
<p style="font-weight:700;font-size:20px;color:#0f6b5f">Cuenta Clara</p><p style="font-size:16px;line-height:24px">${msg}</p></main></body></html>`;
  return new NextResponse(html, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
