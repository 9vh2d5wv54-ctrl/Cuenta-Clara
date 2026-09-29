import type { ClaraNote } from "./clara-note";
import type { ClaraData, ClaraLinks } from "./clara-tools";
import { isDemo } from "./demo";
import type { Bill, Budget, Checkup, Debt, Entry, Goal, NewBill, NewDebt, NewEntry, NewGoal, NewRecipient, Profile, Recipient, Subscription } from "./types";

// One interface, two backends: Supabase when its keys are set, otherwise a demo
// store that keeps everything in this browser so the app runs with no setup.

export type EditableProfile = Partial<
  Pick<Profile, "language" | "home_country" | "home_currency" | "email_bills_on" | "email_weekly_on" | "timezone" | "rate_alert_on" | "pay_frequency" | "tax_set_aside_pct" | "balance_cents" | "balance_on" | "buffer_cents" | "payday_anchor" | "payday_cycle" | "currency" | "business_on" | "push_note_on" | "push_bills_on" | "push_payday_on">
>;

/** Totals the AI receives. Computed in code so every number is right. */
export type CheckupInput = {
  language: "es" | "en";
  month: string;
  income_cents: number;
  rent_cents: number;
  bills_cents: number;
  family_cents: number;
  savings_cents: number;
  /** Tax set-aside (Plus); 0 when off. */
  taxes_cents?: number;
  spending_cents: number;
  left_cents: number;
};

export type ClaraTurnData = { question: string; answer: string };
export type ClaraConversation = { id: string; title: string; updated: string };
export type ClaraRequest = {
  question: string;
  conversationId: string;
  history: ClaraTurnData[];
  lang: "es" | "en";
  /** Demo mode only: the browser's own numbers. The real app loads them on the server. */
  snapshot?: ClaraData;
};
export type ClaraResult =
  | {
      kind: "answer";
      answer: string;
      links: ClaraLinks;
      crisis: boolean;
      /** False when Clara wasn't reachable and a plain reply was shown (not counted). */
      ai: boolean;
      remaining: number;
      limit: number;
      per: "day" | "month";
      /** Plus features (the chart) are open for this answer: Plus or a tester account. */
      unlocked?: boolean;
    }
  | { kind: "limit"; plus: boolean; limit: number; per: "day" | "month" }
  | { kind: "error" };

export type CheckoutStart =
  | { kind: "whop"; sessionId: string; planId: string }
  | { kind: "demo" }
  | { kind: "error"; error: string };

export type AuthResult = { ok: true } | { ok: false; error: string };

export interface Store {
  readonly mode: "supabase" | "demo";

  // Auth
  currentUserId(): Promise<string | null>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  sendMagicLink(email: string): Promise<AuthResult>;
  signOut(): Promise<void>;

  // Data
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: EditableProfile): Promise<void>;
  getBudget(month: string): Promise<Budget | null>;
  setIncome(month: string, cents: number): Promise<void>;
  listBills(): Promise<Bill[]>;
  addBill(b: NewBill): Promise<void>;
  deleteBill(id: string): Promise<void>;
  listRecipients(): Promise<Recipient[]>;
  addRecipient(r: NewRecipient): Promise<void>;
  deleteRecipient(id: string): Promise<void>;
  listEntries(month: string): Promise<Entry[]>;
  /** Entries on or after a date (YYYY-MM-DD), newest first. Paycheck mode uses these. */
  listEntriesSince(date: string): Promise<Entry[]>;
  addEntry(e: NewEntry): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  listGoals(): Promise<Goal[]>;
  addGoal(g: NewGoal): Promise<void>;
  addToGoal(id: string, cents: number): Promise<void>;
  deleteGoal(id: string): Promise<void>;
  listDebts(): Promise<Debt[]>;
  addDebt(d: NewDebt): Promise<void>;
  /** A new balance for a debt (they paid some down). */
  updateDebtBalance(id: string, cents: number): Promise<void>;
  deleteDebt(id: string): Promise<void>;
  deleteAccount(): Promise<void>;

  // Checkup
  getCheckup(month: string): Promise<Checkup | null>;
  listCheckups(): Promise<Checkup[]>;
  /** Writes (or returns the existing) checkup for the month. */
  generateCheckup(input: CheckupInput): Promise<Checkup>;

  // Plus
  getSubscription(): Promise<Subscription | null>;
  startCheckout(interval: "monthly" | "yearly"): Promise<CheckoutStart>;
  cancelPlus(): Promise<boolean>;

  // Clara
  claraAsk(req: Omit<ClaraRequest, "snapshot">, snapshot: ClaraData): Promise<ClaraResult>;
  claraConversations(): Promise<ClaraConversation[]>;
  claraConversation(id: string): Promise<ClaraTurnData[]>;
  claraDelete(id: string): Promise<boolean>;
  /** Clara's weekly note for this week or last (null if none yet; demo mode writes one from local data). */
  claraNote(): Promise<ClaraNote | null>;
  claraNoteSeen(id: string): Promise<void>;
}

let store: Store | null = null;

export async function getStore(): Promise<Store> {
  if (store) return store;
  if (!isDemo) {
    const { SupabaseStore } = await import("./store-supabase");
    store = new SupabaseStore();
  } else {
    const { DemoStore } = await import("./store-demo");
    store = new DemoStore();
  }
  return store;
}
