import type { Checkup, Goal, Profile, Subscription } from "./types";

// Cuenta Clara Plus (MVP PRD → Premium plan). Free keeps the whole budget, the
// monthly checkup, family sends and bill reminders. Plus adds the forecast,
// unlimited goals, rate alerts, the "¿Me alcanza?" helper, paycheck mode
// and the tax set-aside.
export const FREE_GOAL_LIMIT = 1; // keep in sync with enforce_goal_limit in supabase/schema.sql
export const ASK_DAILY_LIMIT = 30;
export const TRIAL_DAYS = 7;

export const PRICES = {
  monthly: { label: "$4.99" },
  yearly: { label: "$39.99", perMonth: "$3.33", savingsPct: 33 },
} as const;

export type Interval = "monthly" | "yearly";
export type PlusFeature = "forecast" | "goals" | "rates" | "ask" | "paycheck" | "taxes" | "quicklog" | "paystub" | "projection" | "debts" | "patterns";

export function hasPlus(sub: Subscription | null): boolean {
  return sub?.plan === "plus" && (sub.status === "trialing" || sub.status === "active");
}

/** Has this person ever started a trial? Shapes the trial button and email copy. */
export function hadTrial(sub: Subscription | null): boolean {
  return Boolean(sub?.trial_ends_at);
}

export function canAddGoal(sub: Subscription | null, goals: Goal[]): boolean {
  return hasPlus(sub) || goals.length < FREE_GOAL_LIMIT;
}

/** PRD rule: the paywall never shows before the first checkup. */
export function paywallAllowed(checkups: Checkup[] | Checkup | null): boolean {
  return Array.isArray(checkups) ? checkups.length > 0 : checkups !== null;
}

/** The tax set-aside percent in effect: only while Plus is active. */
export function taxPct(profile: Pick<Profile, "tax_set_aside_pct"> | null, sub: Subscription | null): number {
  return hasPlus(sub) ? (profile?.tax_set_aside_pct ?? 0) : 0;
}
