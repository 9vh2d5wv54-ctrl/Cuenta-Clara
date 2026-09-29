import type { Locale } from "@/i18n/config";

// Mirrors supabase/schema.sql. All money is integer cents in USD.

export type Profile = {
  id: string;
  email: string;
  language: Locale;
  home_country: string | null;
  home_currency: string | null;
  email_bills_on: boolean;
  email_weekly_on: boolean;
  timezone: string;
  rate_alert_on: boolean;
  /** Paycheck mode (Plus): how often pay usually comes. Null = plan by month. */
  pay_frequency?: PayFrequency | null;
  /** Tax set-aside (Plus): percent of income to set aside, for pay with no taxes taken out. Null = off. */
  tax_set_aside_pct?: number | null;
  /** WhatsApp assistant (Plus): the connected number, digits only. Server-managed. */
  whatsapp_phone?: string | null;
  /** Safe to Spend: the balance they typed and the day they typed it. */
  balance_cents?: number | null;
  balance_on?: string | null;
  buffer_cents?: number;
  /** A payday (YYYY-MM-DD); later ones follow payday_cycle. */
  payday_anchor?: string | null;
  payday_cycle?: "weekly" | "biweekly" | "semimonthly" | "monthly" | null;
  /** The person's own currency: US dollar, Canadian dollar or British pound. Null/missing = USD. */
  currency?: "USD" | "CAD" | "GBP" | "DOP" | null;
  /** Business mode: mark income and spending as business (side hustle, gig, self-employed). */
  business_on?: boolean;
  /** Phone notifications, by kind (on unless turned off). */
  push_note_on?: boolean;
  push_bills_on?: boolean;
  push_payday_on?: boolean;
  created_at: string;
};

/** Plus subscription. Written only by the Whop webhook; the app reads it. */
export type Subscription = {
  plan: "free" | "plus";
  status: "trialing" | "active" | "canceled";
  trial_ends_at: string | null;
  renews_at: string | null;
  cancel_at_period_end: boolean;
};

export type Checkup = {
  month: string; // YYYY-MM
  language: Locale;
  summary_text: string;
  created_at: string;
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
export type PayFrequency = "weekly" | "biweekly";

export type Recipient = {
  id: string;
  user_id: string;
  name: string;
  country: string;
  currency: string;
  default_amount_cents: number;
  frequency: Frequency;
};

export type EntryType = "expense" | "send" | "bill_paid" | "savings" | "income";

export type Entry = {
  id: string;
  user_id: string;
  type: EntryType;
  amount_cents: number;
  category: string;
  recipient_id: string | null;
  date: string; // YYYY-MM-DD
  note: string | null;
  /** Business mode: this income or cost is for their business. Missing = personal. */
  business?: boolean;
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_cents: number;
  target_date: string; // YYYY-MM-DD
  saved_cents: number;
};

/** A debt in the payoff simulator. apr is a yearly percent, like 24.99. */
export type Debt = {
  id: string;
  user_id: string;
  name: string;
  balance_cents: number;
  start_balance_cents: number;
  apr: number;
  min_payment_cents: number;
};

export type NewBill = Omit<Bill, "id" | "user_id">;
export type NewDebt = Omit<Debt, "id" | "user_id" | "start_balance_cents">;
export type NewRecipient = Omit<Recipient, "id" | "user_id">;
export type NewEntry = Omit<Entry, "id" | "user_id">;
export type NewGoal = Omit<Goal, "id" | "user_id" | "saved_cents"> & { saved_cents?: number };
