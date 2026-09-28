import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClaraData } from "./clara-tools";
import { todayISO } from "./dates";
import { taxPct } from "./plan";
import type { Bill, Debt, Entry, Goal, Profile, Recipient, Subscription } from "./types";

// Server-side loading for Clara: the signed-in person's own numbers, read with
// their session (row-level security), never taken from the browser.

/** "Now" as a wall-clock time in the person's timezone, so "today" matches their day. */
export function userNow(timezone: string | null | undefined, at = new Date()): Date {
  try {
    return new Date(at.toLocaleString("en-US", { timeZone: timezone || "America/New_York" }));
  } catch {
    return at;
  }
}

export async function loadClaraData(db: SupabaseClient, now: Date): Promise<{ data: ClaraData; profile: Profile | null }> {
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 130);
  const month = todayISO(now).slice(0, 7);
  const [profile, budget, bills, recipients, recent, goals, debts, sub] = await Promise.all([
    db.from("users").select("*").maybeSingle(),
    db.from("budgets").select("income_cents").lte("month", month).order("month", { ascending: false }).limit(1).maybeSingle(),
    db.from("bills").select("*"),
    db.from("recipients").select("*"),
    db.from("entries").select("*").gte("date", todayISO(since)),
    db.from("goals").select("*"),
    db.from("debts").select("*"),
    db.from("subscriptions").select("plan, status, trial_ends_at, renews_at, cancel_at_period_end").maybeSingle(),
  ]);
  const p = (profile.data ?? null) as Profile | null;
  const subscription = (sub.data ?? null) as Subscription | null;
  return {
    profile: p,
    data: {
      profile: p,
      income: (budget.data as { income_cents?: number } | null)?.income_cents ?? 0,
      bills: (bills.data ?? []) as Bill[],
      recipients: (recipients.data ?? []) as Recipient[],
      recent: (recent.data ?? []) as Entry[],
      goals: (goals.data ?? []) as Goal[],
      // Before migration 006 the debts table may not exist; Clara just sees none.
      debts: ((debts.data ?? []) as Debt[]).map((d) => ({ ...d, apr: Number(d.apr) })),
      subscription,
      taxPct: taxPct(p, subscription),
    },
  };
}
