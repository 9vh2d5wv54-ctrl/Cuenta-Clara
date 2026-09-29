import { NextResponse } from "next/server";
import { pushConfigured, sendPush } from "@/lib/push";
import { supabaseFromCookies } from "@/lib/supabase-server";

// Settings → Phone notifications → "Send a test": one notification to your own phones.
export async function POST() {
  if (!pushConfigured()) return NextResponse.json({ error: "not set up" }, { status: 503 });
  const supabase = await supabaseFromCookies();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("language").maybeSingle();
  const es = profile?.language !== "en";
  const delivered = await sendPush(supabase, auth.user.id, {
    title: "Clara",
    body: es ? "Así te llegarán tus avisos: la nota del domingo, tus cuentas y tu día de pago." : "This is how your alerts will look: Sunday's note, your bills and your payday.",
    url: "/app",
    tag: "test",
  });
  return NextResponse.json({ ok: delivered > 0, delivered });
}
