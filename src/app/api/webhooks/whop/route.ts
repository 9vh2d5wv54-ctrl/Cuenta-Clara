import { NextResponse, type NextRequest } from "next/server";
import { unwrapWebhook, WebhookVerificationError } from "@whop/sdk/helpers";
import { supabaseAdmin } from "@/lib/supabase-server";

// Whop → Cuenta Clara. Every membership change sets the user's Premium flag.
// Subscribe the webhook in Whop to: membership.activated, membership.deactivated,
// membership.cancel_at_period_end_changed.

type MembershipEvent = {
  type: string;
  data?: {
    id?: string;
    status?: string;
    metadata?: Record<string, unknown> | null;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean;
  };
};

// Statuses that keep access (past_due is Whop's grace period after a failed charge).
const ACCESS = new Set(["active", "trialing", "past_due", "canceling", "completed"]);

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

  const premium = event.type !== "membership.deactivated" && ACCESS.has(m.status ?? "");
  const { error } = await supabaseAdmin()
    .from("users")
    .update({
      premium,
      premium_period_end: m.current_period_end ?? null,
      premium_cancel_at_period_end: m.cancel_at_period_end ?? false,
      whop_membership_id: m.id ?? null,
    })
    .eq("id", userId);
  if (error) {
    console.error("premium update failed", error);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, premium });
}
