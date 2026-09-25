import type {
  Bill, Budget, Checkup, Entry, Goal, NewBill, NewEntry, NewGoal, NewRecipient, Profile, Recipient, Subscription,
} from "./types";

// One interface, two backends: Supabase when its keys are set, otherwise a demo
// store that keeps everything in this browser so the app runs with no setup.

export type EditableProfile = Partial<
  Pick<Profile, "language" | "home_country" | "home_currency" | "email_bills_on" | "email_weekly_on" | "timezone" | "rate_alert_on">
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
  spending_cents: number;
  left_cents: number;
};

export type AskResult =
  | { kind: "answer"; answer: string; remaining: number }
  | { kind: "limit" }
  | { kind: "plus_required" }
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
  addEntry(e: NewEntry): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  listGoals(): Promise<Goal[]>;
  addGoal(g: NewGoal): Promise<void>;
  addToGoal(id: string, cents: number): Promise<void>;
  deleteGoal(id: string): Promise<void>;
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
  ask(question: string, input: CheckupInput): Promise<AskResult>;
}

let store: Store | null = null;

export async function getStore(): Promise<Store> {
  if (store) return store;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const { SupabaseStore } = await import("./store-supabase");
    store = new SupabaseStore();
  } else {
    const { DemoStore } = await import("./store-demo");
    store = new DemoStore();
  }
  return store;
}
