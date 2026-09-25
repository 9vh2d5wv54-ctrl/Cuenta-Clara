import type { AuthResult, CheckoutStart, EditableProfile, Store } from "./store";
import type {
  Bill, Budget, Entry, Goal, NewBill, NewEntry, NewGoal, NewRecipient, Profile, Recipient,
} from "./types";

// Demo mode: one account per browser, saved in localStorage. No password checks.

type DemoData = {
  profile: Profile | null;
  signedIn: boolean;
  budgets: Budget[];
  bills: Bill[];
  recipients: Recipient[];
  entries: Entry[];
  goals: Goal[];
};

const KEY = "cuenta-clara-demo";
const USER_ID = "demo-user";

function empty(): DemoData {
  return { profile: null, signedIn: false, budgets: [], bills: [], recipients: [], entries: [], goals: [] };
}

function load(): DemoData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

function save(data: DemoData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Private mode or storage full: the session still works until reload.
  }
}

function id(): string {
  return crypto.randomUUID();
}

export class DemoStore implements Store {
  readonly mode = "demo" as const;

  private update(fn: (d: DemoData) => void) {
    const d = load();
    fn(d);
    save(d);
  }

  async currentUserId() {
    return load().signedIn ? USER_ID : null;
  }

  private async enter(email: string): Promise<AuthResult> {
    this.update((d) => {
      d.signedIn = true;
      if (!d.profile || d.profile.email !== email) {
        const fresh = empty();
        Object.assign(d, fresh, { signedIn: true });
        d.profile = {
          id: USER_ID,
          email,
          language: document.documentElement.lang === "en" ? "en" : "es",
          home_country: null,
          home_currency: null,
          reminders_on: true,
          created_at: new Date().toISOString(),
          premium: false,
          premium_period_end: null,
          premium_cancel_at_period_end: false,
        };
      }
    });
    return { ok: true };
  }

  signUp(email: string) {
    return this.enter(email);
  }
  signIn(email: string) {
    return this.enter(email);
  }
  sendMagicLink(email: string) {
    return this.enter(email);
  }
  async signOut() {
    this.update((d) => {
      d.signedIn = false;
    });
  }

  async getProfile() {
    const p = load().profile;
    // Profiles saved before Premium existed lack its fields.
    return p ? Object.assign({ premium: false, premium_period_end: null, premium_cancel_at_period_end: false }, p) : null;
  }
  async updateProfile(patch: EditableProfile) {
    this.update((d) => {
      if (d.profile) d.profile = { ...d.profile, ...patch };
    });
  }

  async getBudget(month: string) {
    return load().budgets.find((b) => b.month === month) ?? null;
  }
  async setIncome(month: string, cents: number) {
    this.update((d) => {
      const existing = d.budgets.find((b) => b.month === month);
      if (existing) existing.income_cents = cents;
      else d.budgets.push({ id: id(), user_id: USER_ID, month, income_cents: cents });
    });
  }

  async listBills() {
    return [...load().bills].sort((a, b) => a.due_day - b.due_day);
  }
  async addBill(b: NewBill) {
    this.update((d) => d.bills.push({ ...b, id: id(), user_id: USER_ID }));
  }
  async deleteBill(billId: string) {
    this.update((d) => {
      d.bills = d.bills.filter((b) => b.id !== billId);
    });
  }

  async listRecipients() {
    return load().recipients;
  }
  async addRecipient(r: NewRecipient) {
    this.update((d) => d.recipients.push({ ...r, id: id(), user_id: USER_ID }));
  }
  async deleteRecipient(recipientId: string) {
    this.update((d) => {
      d.recipients = d.recipients.filter((r) => r.id !== recipientId);
    });
  }

  async listEntries(month: string) {
    return load()
      .entries.filter((e) => e.date.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  async listAllEntries() {
    return [...load().entries].sort((a, b) => b.date.localeCompare(a.date));
  }
  async addEntry(e: NewEntry) {
    this.update((d) => d.entries.push({ ...e, id: id(), user_id: USER_ID }));
  }
  async deleteEntry(entryId: string) {
    this.update((d) => {
      d.entries = d.entries.filter((e) => e.id !== entryId);
    });
  }

  async listGoals() {
    return load().goals;
  }
  async addGoal(g: NewGoal) {
    this.update((d) => d.goals.push({ saved_cents: 0, ...g, id: id(), user_id: USER_ID }));
  }
  async addToGoal(goalId: string, cents: number) {
    this.update((d) => {
      const g = d.goals.find((x) => x.id === goalId);
      if (g) g.saved_cents += cents;
    });
  }
  async deleteGoal(goalId: string) {
    this.update((d) => {
      d.goals = d.goals.filter((g) => g.id !== goalId);
    });
  }

  async startCheckout(): Promise<CheckoutStart> {
    return { kind: "demo" };
  }

  /** Demo mode has no payments: the paywall offers this instead of a checkout. */
  async activateDemoPremium() {
    this.update((d) => {
      if (d.profile) d.profile.premium = true;
    });
  }

  async deleteAccount() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nothing to remove
    }
  }
}
