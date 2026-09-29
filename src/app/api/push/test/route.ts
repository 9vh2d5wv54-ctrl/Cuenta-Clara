import { NextResponse } from "next/server";
import { lastPushErrors, pushConfigured, sendPush, vapidPublicKey } from "@/lib/push";
import { isTester } from "@/lib/testers";
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

// Testers: open /api/push/test in Safari (signed in) to send a test to your phones
// and see exactly what happened.
export async function GET() {
  const supabase = await supabaseFromCookies();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return NextResponse.json({ ok: false, problem: "sign in to the app in Safari first" });
  if (!isTester(auth.user.email)) return NextResponse.json({ ok: false, problem: "only for tester accounts" }, { status: 403 });
  const hasPrivate = Boolean(process.env.VAPID_PRIVATE_KEY);
  const key = vapidPublicKey();
  const { data: phones, error } = await supabase.from("push_subscriptions").select("device, endpoint, created_at");
  lastPushErrors.length = 0;
  const delivered = key ? await sendPush(supabase, auth.user.id, { title: "Clara", body: "Test from the check page.", url: "/app", tag: "test" }) : 0;
  const problem = !hasPrivate
    ? "VAPID_PRIVATE_KEY is missing in Vercel (then redeploy)"
    : !key
      ? "VAPID_PRIVATE_KEY in Vercel isn't a valid key: make a new one on /app/admin, replace it in Vercel, redeploy"
      : error
        ? "the push_subscriptions table is missing (run migration 012)"
        : !phones?.length
          ? "no phone is signed up: open the app from the Home Screen icon → Settings → Phone notifications → Turn on"
          : delivered === 0
            ? "not delivered: open the app from the Home Screen icon → Settings → Phone notifications (it re-signs up with the right key) → Turn on, then try again"
            : null;
  return NextResponse.json({
    ok: delivered > 0,
    delivered,
    problem,
    private_key_valid: Boolean(key),
    public_key_starts: key ? key.slice(0, 8) : null,
    phones: (phones ?? []).map((p) => ({ device: p.device, service: new URL(p.endpoint).host, since: p.created_at })),
    errors: lastPushErrors.slice(),
  });
}
