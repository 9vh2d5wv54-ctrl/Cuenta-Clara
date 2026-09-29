import { NextResponse } from "next/server";
import { keysMatch, lastPushErrors, pushConfigured, sendPush } from "@/lib/push";
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
  const hasPublic = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const hasPrivate = Boolean(process.env.VAPID_PRIVATE_KEY);
  const match = keysMatch();
  const { data: phones, error } = await supabase.from("push_subscriptions").select("device, endpoint, created_at");
  lastPushErrors.length = 0;
  const delivered = pushConfigured() && match ? await sendPush(supabase, auth.user.id, { title: "Clara", body: "Test from the check page.", url: "/app", tag: "test" }) : 0;
  const problem = !hasPublic
    ? "NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing in Vercel (then redeploy)"
    : !hasPrivate
      ? "VAPID_PRIVATE_KEY is missing in Vercel (then redeploy)"
      : !match
        ? "the two keys in Vercel are not from the same pair: make new keys on /app/admin, replace both in Vercel, redeploy, then turn notifications off and on in the app"
        : error
          ? "the push_subscriptions table is missing (run migration 012)"
          : !phones?.length
            ? "no phone is signed up: turn on notifications in the app (from the Home Screen icon)"
            : delivered === 0
              ? "Apple/Google refused it; see errors"
              : null;
  return NextResponse.json({
    ok: delivered > 0,
    delivered,
    problem,
    keys: { public: hasPublic, private: hasPrivate, same_pair: match },
    phones: (phones ?? []).map((p) => ({ device: p.device, service: new URL(p.endpoint).host, since: p.created_at })),
    errors: lastPushErrors.slice(),
  });
}
