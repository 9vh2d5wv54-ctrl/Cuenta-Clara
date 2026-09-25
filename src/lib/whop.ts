import { WhopClient } from "@whop/sdk";

// Server-only. The SDK reads no env vars itself, so the key is passed here.
export function whopClient() {
  const token = process.env.WHOP_API_KEY;
  if (!token) throw new Error("WHOP_API_KEY is not set");
  return new WhopClient({ token });
}

// The Cuenta Clara business in Whop (from the dashboard address). Not a secret.
// The last character was hard to read (lowercase L or capital i), so both are
// tried once and the one Whop accepts is kept. WHOP_ACCOUNT_ID overrides.
const ACCOUNT_CANDIDATES = ["biz_zmiyiY92Ucpo6l", "biz_zmiyiY92Ucpo6I"];

let accountCache: string | undefined;

/** The Whop business (biz_…) this API key belongs to. */
export async function whopAccountId(): Promise<string> {
  if (process.env.WHOP_ACCOUNT_ID) return process.env.WHOP_ACCOUNT_ID;
  if (accountCache) return accountCache;
  let lastError: unknown;
  for (const id of ACCOUNT_CANDIDATES) {
    try {
      await whopClient().plans.list({ account_id: id, first: 1 });
      accountCache = id;
      return id;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
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
    account_id: await whopAccountId(),
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
