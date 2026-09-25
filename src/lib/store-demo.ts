import type { AskResult, AuthResult, CheckoutStart, CheckupInput, EditableProfile, Store } from "./store";
import { ASK_DAILY_LIMIT, TRIAL_DAYS } from "./plan";
import { todayISO } from "./dates";
import type {
  Bill, Budget, Checkup, Entry, Goal, NewBill, NewEntry, NewGoal, NewRecipient, Profile, Recipient, Subscription,
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
  subscription: Subscription;
  checkups: Checkup[];
  asked: { date: string; count: number };
};

const FREE: Subscription = {
  plan: "free",
  status: "active",
  trial_ends_at: null,
  renews_at: null,
  cancel_at_period_end: false,
};

const KEY = "cuenta-clara-demo";
const USER_ID = "demo-user";

function empty(): DemoData {
  return {
    profile: null,
    signedIn: false,
    budgets: [],
    bills: [],
    recipients: [],
    entries: [],
    goals: [],
    subscription: FREE,
    checkups: [],
    asked: { date: "", count: 0 },
  };
}

function load(): DemoData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = { ...empty(), ...JSON.parse(raw) } as DemoData;
    if (data.profile && data.profile.email_bills_on === undefined) {
      data.profile = {
        ...data.profile,
        email_bills_on: true,
        email_weekly_on: true,
        timezone: "America/New_York",
        rate_alert_on: false,
      };
    }
    return data;
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
          email_bills_on: true,
          email_weekly_on: true,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          rate_alert_on: false,
          created_at: new Date().toISOString(),
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
    return load().profile;
  }
  async updateProfile(patch: EditableProfile) {
    this.update((d) => {
      if (d.profile) d.profile = { ...d.profile, ...patch };
    });
  }

  /** This month's budget, or the latest earlier one carried forward. */
  async getBudget(month: string) {
    const earlier = load()
      .budgets.filter((b) => b.month <= month)
      .sort((a, b) => b.month.localeCompare(a.month));
    return earlier[0] ?? null;
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

  async getCheckup(month: string) {
    return load().checkups.find((c) => c.month === month) ?? null;
  }
  async listCheckups() {
    return [...load().checkups].sort((a, b) => b.month.localeCompare(a.month));
  }
  async generateCheckup(input: CheckupInput) {
    const existing = await this.getCheckup(input.month);
    if (existing) return existing;
    // The server writes the words (Claude, or a plain template without a key).
    const res = await fetch("/api/checkup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`checkup ${res.status}`);
    const checkup = (await res.json()) as Checkup;
    this.update((d) => d.checkups.push(checkup));
    return checkup;
  }

  async getSubscription() {
    return load().subscription ?? FREE;
  }
  async startCheckout(): Promise<CheckoutStart> {
    return { kind: "demo" };
  }
  /** Demo mode has no payments: the paywall starts a pretend 7-day trial instead. */
  async startDemoTrial() {
    this.update((d) => {
      const ends = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString();
      d.subscription = { plan: "plus", status: "trialing", trial_ends_at: ends, renews_at: ends, cancel_at_period_end: false };
    });
  }
  async cancelPlus() {
    this.update((d) => {
      d.subscription = { ...d.subscription, cancel_at_period_end: true };
    });
    return true;
  }
  async ask(question: string, input: CheckupInput): Promise<AskResult> {
    const d = load();
    if (d.subscription.plan !== "plus") return { kind: "plus_required" };
    const today = todayISO();
    const count = d.asked.date === today ? d.asked.count : 0;
    if (count >= ASK_DAILY_LIMIT) return { kind: "limit" };
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, input }),
    });
    if (!res.ok) return { kind: "error" };
    const { answer } = (await res.json()) as { answer: string };
    this.update((x) => {
      x.asked = { date: today, count: count + 1 };
    });
    return { kind: "answer", answer, remaining: ASK_DAILY_LIMIT - count - 1 };
  }

  async deleteAccount() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nothing to remove
    }
  }
}
