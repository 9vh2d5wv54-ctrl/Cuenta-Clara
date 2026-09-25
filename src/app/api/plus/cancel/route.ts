import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseFromCookies } from "@/lib/supabase-server";
import { whopClient } from "@/lib/whop";

// Settings → Cancel Plus. Cancels at the end of the paid period (or trial), so
// nothing more is charged and access lasts until then. Whop's webhook confirms.
export async function POST() {
  const supabase = await supabaseFromCookies();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("provider_membership_id, plan")
    .maybeSingle();
  if (!sub?.provider_membership_id || sub.plan !== "plus") {
    return NextResponse.json({ error: "no subscription" }, { status: 404 });
  }

  let renewsAt: string | null = null;
  try {
    const m = await whopClient().memberships.cancel({ id: sub.provider_membership_id, cancel_at_period_end: true });
    renewsAt = (m as { current_period_end?: string | null }).current_period_end ?? null;
  } catch (err) {
    console.error("whop cancel failed", err);
    return NextResponse.json({ error: "cancel failed" }, { status: 502 });
  }
  // Show it right away; the webhook will write the same thing.
  await supabaseAdmin()
    .from("subscriptions")
    .update(renewsAt ? { cancel_at_period_end: true, renews_at: renewsAt } : { cancel_at_period_end: true })
    .eq("user_id", auth.user.id);
  return NextResponse.json({ ok: true });
}
