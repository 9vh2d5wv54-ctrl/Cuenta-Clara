import type { SupabaseClient } from "@supabase/supabase-js";
import { checkupInput, summarize } from "./budget";
import type { CheckupInput } from "./store";
import type { Bill, Entry, Goal, Recipient } from "./types";

// Server-side view of one person's month, for the cron emails and alerts.
// Same math as the app (lib/budget.ts), so emails and screens always agree.

export type UserMonth = {
  income: number;
  bills: Bill[];
  recipients: Recipient[];
  goals: Goal[];
  entries: Entry[];
};

export async function loadUserMonth(db: SupabaseClient, userId: string, month: string): Promise<UserMonth> {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const [budget, bills, recipients, goals, entries] = await Promise.all([
    db.from("budgets").select("income_cents").eq("user_id", userId).lte("month", month).order("month", { ascending: false }).limit(1).maybeSingle(),
    db.from("bills").select("*").eq("user_id", userId),
    db.from("recipients").select("*").eq("user_id", userId),
    db.from("goals").select("*").eq("user_id", userId),
    db.from("entries").select("*").eq("user_id", userId).gte("date", `${month}-01`).lt("date", `${next}-01`),
  ]);
  return {
    income: budget.data?.income_cents ?? 0,
    bills: (bills.data ?? []) as Bill[],
    recipients: (recipients.data ?? []) as Recipient[],
    goals: (goals.data ?? []) as Goal[],
    entries: (entries.data ?? []) as Entry[],
  };
}

export function monthTotals(u: UserMonth, at = new Date()) {
  return summarize(u.income, u.bills, u.recipients, u.goals, u.entries, at);
}

export function monthInput(u: UserMonth, language: "es" | "en", month: string, at = new Date()): CheckupInput {
  return checkupInput(language, month, u.income, u.bills, u.recipients, u.goals, u.entries, at);
}
