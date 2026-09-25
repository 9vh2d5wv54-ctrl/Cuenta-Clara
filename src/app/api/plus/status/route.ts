import { NextResponse } from "next/server";
import { planIdFor, whopClient } from "@/lib/whop";

// Payment setup check: open /api/plus/status in a browser. Shows which step
// fails without exposing any secret (plan ids and prices are public anyway).
export const dynamic = "force-dynamic";

function describe(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { status?: number; statusCode?: number; message?: string; name?: string };
    return `${e.name ?? "Error"} ${e.statusCode ?? e.status ?? ""} ${(e.message ?? "").slice(0, 300)}`.trim();
  }
  return String(err).slice(0, 300);
}

export async function GET() {
  const out: Record<string, unknown> = {
    whop_api_key_set: Boolean(process.env.WHOP_API_KEY),
    whop_webhook_secret_set: Boolean(process.env.WHOP_WEBHOOK_SECRET),
    whop_account_id_set: Boolean(process.env.WHOP_ACCOUNT_ID),
    supabase_set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  };
  if (!process.env.WHOP_API_KEY) return NextResponse.json({ ...out, problem: "WHOP_API_KEY is missing in this deployment" });

  try {
    const page = await whopClient().plans.list({ account_id: process.env.WHOP_ACCOUNT_ID, first: 50 });
    const plans: unknown[] = [];
    for await (const p of page) {
      plans.push({
        id: p.id,
        plan_type: p.plan_type,
        renewal_price: p.renewal_price,
        initial_price: p.initial_price,
        billing_period: p.billing_period,
        currency: p.currency,
        visibility: (p as { visibility?: string }).visibility,
      });
      if (plans.length >= 20) break;
    }
    out.plans_seen = plans;
  } catch (err) {
    return NextResponse.json({ ...out, problem: "listing plans failed", error: describe(err) });
  }

  for (const interval of ["monthly", "yearly"] as const) {
    try {
      out[`${interval}_plan`] = (await planIdFor(interval)) ?? "NOT FOUND";
    } catch (err) {
      out[`${interval}_plan`] = `error: ${describe(err)}`;
    }
  }
  return NextResponse.json(out);
}
