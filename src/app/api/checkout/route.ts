import { NextResponse, type NextRequest } from "next/server";
import { supabaseFromCookies } from "@/lib/supabase-server";
import { planIdFor, whopClient } from "@/lib/whop";

// Creates a Whop checkout session for the signed-in user. The user id rides along
// as metadata, and Whop copies it onto the membership, which is how the webhook
// knows whose account to upgrade.
export async function POST(request: NextRequest) {
  const { interval } = (await request.json().catch(() => ({}))) as { interval?: string };
  if (interval !== "monthly" && interval !== "yearly") {
    return NextResponse.json({ error: "bad interval" }, { status: 400 });
  }
  if (!process.env.WHOP_API_KEY) {
    return NextResponse.json({ error: "payments not configured" }, { status: 503 });
  }

  const supabase = await supabaseFromCookies();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  try {
    const planId = await planIdFor(interval);
    if (!planId) {
      console.error(`no Whop plan found for ${interval}`);
      return NextResponse.json({ error: "plan not found" }, { status: 503 });
    }
    const session = await whopClient().checkoutConfigurations.create({
      account_id: process.env.WHOP_ACCOUNT_ID,
      plan_id: planId,
      metadata: { user_id: data.user.id },
    });
    return NextResponse.json({ sessionId: session.id, planId });
  } catch (err) {
    console.error("whop checkout session failed", err);
    return NextResponse.json({ error: "checkout unavailable" }, { status: 502 });
  }
}
