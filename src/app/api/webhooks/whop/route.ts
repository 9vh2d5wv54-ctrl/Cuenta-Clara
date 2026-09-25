import { NextResponse, type NextRequest } from "next/server";
import { unwrapWebhook, WebhookVerificationError } from "@whop/sdk/helpers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { whopClient } from "@/lib/whop";

// Whop → Cuenta Clara. Keeps the subscriptions table in sync with the membership.
// Subscribe in Whop to: membership.activated, membership.deactivated,
// membership.cancel_at_period_end_changed.

type MembershipEvent = {
  type: string;
  data?: {
    id?: string;
    status?: string;
    user_id?: string | null;
    metadata?: Record<string, unknown> | null;
    current_period_end?: string | null;
    renewal_period_end?: string | number | null;
    expires_at?: string | number | null;
    cancel_at_period_end?: boolean;
  };
};

// Whop status → our status. past_due is Whop's grace period after a failed charge.
function mapStatus(event: string, whop: string | undefined): "trialing" | "active" | "canceled" {
  if (event === "membership.deactivated") return "canceled";
  if (whop === "trialing") return "trialing";
  if (whop === "active" || whop === "past_due" || whop === "canceling" || whop === "completed") return "active";
  return "canceled";
}

function toIso(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** When the paid period (or trial) ends. Asks Whop directly if the event didn't include it. */
async function periodEndFor(m: NonNullable<MembershipEvent["data"]>): Promise<string | null> {
  const fromEvent = toIso(m.current_period_end) ?? toIso(m.renewal_period_end) ?? toIso(m.expires_at);
  if (fromEvent || !m.id || !process.env.WHOP_API_KEY) return fromEvent;
  try {
    const membership = await whopClient().memberships.retrieve({ id: m.id });
    return toIso(membership.current_period_end);
  } catch (err) {
    console.error("membership lookup failed", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  let event: MembershipEvent;
  try {
    event = unwrapWebhook<MembershipEvent>(raw, {
      headers: Object.fromEntries(request.headers),
      key: process.env.WHOP_WEBHOOK_SECRET,
    });
  } catch (err) {
    const status = err instanceof WebhookVerificationError ? 401 : 500;
    return NextResponse.json({ error: "invalid signature" }, { status });
  }

  if (!event.type?.startsWith("membership.") || !event.data) {
    return NextResponse.json({ ignored: event.type });
  }
  const m = event.data;
  const userId = typeof m.metadata?.user_id === "string" ? m.metadata.user_id : null;
  if (!userId) return NextResponse.json({ ignored: "no user_id" });

  const status = mapStatus(event.type, m.status);
  const periodEnd = await periodEndFor(m);
  const row: Record<string, unknown> = {
    user_id: userId,
    plan: status === "canceled" ? "free" : "plus",
    status,
    renews_at: periodEnd,
    cancel_at_period_end: m.cancel_at_period_end ?? false,
    provider_customer_id: m.user_id ?? null,
    provider_membership_id: m.id ?? null,
  };
  // Remember the trial end once; it also tells us they've had a trial.
  if (status === "trialing") row.trial_ends_at = periodEnd;

  const { error } = await supabaseAdmin().from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) {
    console.error("subscription update failed", error);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status });
}
