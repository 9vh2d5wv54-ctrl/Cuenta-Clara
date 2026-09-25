import type { Goal, Profile, Recipient } from "./types";

// Free covers the whole MVP. Premium lifts these limits and adds CSV export.
// Keep in sync with the triggers at the end of supabase/schema.sql.
export const FREE_LIMITS = { goals: 1, countries: 1 } as const;

export const PRICES = {
  monthly: { cents: 499, label: "$4.99" },
  yearly: { cents: 3999, label: "$39.99", perMonth: "$3.33", savingsPct: 33 },
} as const;

export type Interval = keyof typeof PRICES;
export type PremiumFeature = "goals" | "countries" | "export";

export function isPremium(profile: Profile | null): boolean {
  return profile?.premium === true;
}

export function canAddGoal(profile: Profile | null, goals: Goal[]): boolean {
  return isPremium(profile) || goals.length < FREE_LIMITS.goals;
}

export function canSendTo(profile: Profile | null, recipients: Recipient[], country: string): boolean {
  if (isPremium(profile)) return true;
  const countries = new Set(recipients.map((r) => r.country));
  return countries.has(country) || countries.size < FREE_LIMITS.countries;
}
