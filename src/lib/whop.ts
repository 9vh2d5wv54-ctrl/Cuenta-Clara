import { WhopClient } from "@whop/sdk";

// Server-only. The SDK reads no env vars itself, so the key is passed here.
export function whopClient() {
  const token = process.env.WHOP_API_KEY;
  if (!token) throw new Error("WHOP_API_KEY is not set");
  return new WhopClient({ token });
}

type Interval = "monthly" | "yearly";

// What each Plus plan looks like in Whop (MVP PRD → Premium plan).
const TARGET: Record<Interval, { price: number; minDays: number; maxDays: number }> = {
  monthly: { price: 4.99, minDays: 28, maxDays: 31 },
  yearly: { price: 39.99, minDays: 360, maxDays: 366 },
};

const cache: Partial<Record<Interval, string>> = {};

/**
 * The Whop plan id for an interval. WHOP_PLAN_MONTHLY / WHOP_PLAN_YEARLY win when
 * set; otherwise the plan is found in the Whop account by its price and billing
 * period, so nobody has to copy plan ids out of the dashboard.
 */
export async function planIdFor(interval: Interval): Promise<string | undefined> {
  const fromEnv = interval === "yearly" ? process.env.WHOP_PLAN_YEARLY : process.env.WHOP_PLAN_MONTHLY;
  if (fromEnv) return fromEnv;
  if (cache[interval]) return cache[interval];

  const want = TARGET[interval];
  const plans = await whopClient().plans.list({
    account_id: process.env.WHOP_ACCOUNT_ID,
    plan_types: "renewal",
    first: 100,
  });
  for await (const plan of plans) {
    const days = plan.billing_period ?? 0;
    if (
      plan.currency?.toLowerCase() === "usd" &&
      Math.abs(plan.renewal_price - want.price) < 0.005 &&
      days >= want.minDays &&
      days <= want.maxDays
    ) {
      cache[interval] = plan.id;
      return plan.id;
    }
  }
  return undefined;
}
