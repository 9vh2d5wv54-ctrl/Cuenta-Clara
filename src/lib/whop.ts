import { WhopClient } from "@whop/sdk";

// Server-only. The SDK reads no env vars itself, so the key is passed here.
export function whopClient() {
  const token = process.env.WHOP_API_KEY;
  if (!token) throw new Error("WHOP_API_KEY is not set");
  return new WhopClient({ token });
}

export function planIdFor(interval: "monthly" | "yearly"): string | undefined {
  return interval === "yearly" ? process.env.WHOP_PLAN_YEARLY : process.env.WHOP_PLAN_MONTHLY;
}
