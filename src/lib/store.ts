import type {
  Bill, Budget, Entry, Goal, NewBill, NewEntry, NewGoal, NewRecipient, Profile, Recipient,
} from "./types";

// One interface, two backends: Supabase when its keys are set, otherwise a demo
// store that keeps everything in this browser so the app runs with no setup.

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
  updateProfile(patch: Partial<Omit<Profile, "id" | "email" | "created_at">>): Promise<void>;
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
