import type { Locale } from "@/i18n/config";

// Mirrors supabase/schema.sql. All money is integer cents in USD.

export type Profile = {
  id: string;
  email: string;
  language: Locale;
  home_country: string | null;
  home_currency: string | null;
  reminders_on: boolean;
  created_at: string;
  premium: boolean;
  premium_period_end: string | null;
  premium_cancel_at_period_end: boolean;
};

export type Budget = {
  id: string;
  user_id: string;
  month: string; // YYYY-MM
  income_cents: number;
};

export type Bill = {
  id: string;
  user_id: string;
  name: string;
  amount_cents: number;
  due_day: number; // 1–31
  reminder_on: boolean;
};

export type Frequency = "monthly" | "biweekly";

export type Recipient = {
  id: string;
  user_id: string;
  name: string;
  country: string;
  currency: string;
  default_amount_cents: number;
  frequency: Frequency;
};

export type EntryType = "expense" | "send" | "bill_paid" | "savings";

export type Entry = {
  id: string;
  user_id: string;
  type: EntryType;
  amount_cents: number;
  category: string;
  recipient_id: string | null;
  date: string; // YYYY-MM-DD
  note: string | null;
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_cents: number;
  target_date: string; // YYYY-MM-DD
  saved_cents: number;
};

export type NewBill = Omit<Bill, "id" | "user_id">;
export type NewRecipient = Omit<Recipient, "id" | "user_id">;
export type NewEntry = Omit<Entry, "id" | "user_id">;
export type NewGoal = Omit<Goal, "id" | "user_id" | "saved_cents"> & { saved_cents?: number };
