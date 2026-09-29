import type { AuthResult, CheckoutStart, CheckupInput, ClaraConversation, ClaraRequest, ClaraResult, ClaraTurnData, EditableProfile, Store } from "./store";
import type { ClaraData } from "./clara-tools";
import { soundsLikeCrisis } from "./clara-safety";
import { claraAllowance, hasPlus, taxPct, TRIAL_DAYS } from "./plan";
import { businessEntries } from "./business";
import { fallbackNote, hasNoteData, noteWeek, type ClaraNote } from "./clara-note";
import { todayISO } from "./dates";
import type {
  Bill, Budget, Checkup, Debt, Entry, Goal, NewBill, NewDebt, NewEntry, NewGoal, NewRecipient, Profile, Recipient, Subscription,
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
  debts: Debt[];
  subscription: Subscription;
  checkups: Checkup[];
  asked: { date: string; count: number };
  /** Clara: the dates of counted questions, and saved conversations. */
  claraAsked: string[];
  clara: (ClaraConversation & { turns: ClaraTurnData[] })[];
  /** Weekly note: the week it was last marked seen. */
  noteSeen?: string;
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
    debts: [],
    subscription: FREE,
    checkups: [],
    asked: { date: "", count: 0 },
    claraAsked: [],
    clara: [],
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
        pay_frequency: null,
        tax_set_aside_pct: null,
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
        pay_frequency: null,
        tax_set_aside_pct: null,
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
  async listEntriesSince(date: string) {
    return load()
      .entries.filter((e) => e.date >= date)
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

  async listDebts() {
    return load().debts;
  }
  async addDebt(debt: NewDebt) {
    this.update((d) => d.debts.push({ ...debt, start_balance_cents: debt.balance_cents, id: id(), user_id: USER_ID }));
  }
  async updateDebtBalance(debtId: string, cents: number) {
    this.update((d) => {
      const x = d.debts.find((y) => y.id === debtId);
      if (x) x.balance_cents = cents;
    });
  }
  async deleteDebt(debtId: string) {
    this.update((d) => {
      d.debts = d.debts.filter((x) => x.id !== debtId);
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
  async claraAsk(req: Omit<ClaraRequest, "snapshot">, snapshot: ClaraData): Promise<ClaraResult> {
    const d = load();
    const plus = hasPlus(d.subscription);
    const allowance = claraAllowance(plus, todayISO());
    const used = d.claraAsked.filter((day) => day >= allowance.since).length;
    if (used >= allowance.limit && !soundsLikeCrisis(req.question)) return { kind: "limit", plus, limit: allowance.limit, per: allowance.per };
    const res = await fetch("/api/clara", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, snapshot }),
    }).catch(() => null);
    if (!res?.ok) return { kind: "error" };
    const body = (await res.json()) as Omit<Extract<ClaraResult, { kind: "answer" }>, "kind" | "remaining" | "limit" | "per">;
    this.update((x) => {
      if (body.ai) x.claraAsked = [...x.claraAsked.filter((day) => day >= `${todayISO().slice(0, 7)}-01`), todayISO()];
      if (!body.ai) return;
      const now = new Date().toISOString();
      const conv = x.clara.find((c) => c.id === req.conversationId);
      const turn = { question: req.question, answer: body.answer };
      if (conv) {
        conv.turns.push(turn);
        conv.updated = now;
      } else {
        x.clara.unshift({ id: req.conversationId, title: req.question, updated: now, turns: [turn] });
      }
    });
    const remaining = Math.max(0, allowance.limit - used - (body.ai ? 1 : 0));
    return { kind: "answer", ...body, remaining, limit: allowance.limit, per: allowance.per };
  }
  async claraConversations(): Promise<ClaraConversation[]> {
    return load()
      .clara.slice()
      .sort((a, b) => b.updated.localeCompare(a.updated))
      .slice(0, 20)
      .map(({ id, title, updated }) => ({ id, title, updated }));
  }
  async claraConversation(id: string): Promise<ClaraTurnData[]> {
    return load().clara.find((c) => c.id === id)?.turns ?? [];
  }
  /** Demo mode has no Sunday job: write this week's note from the local numbers (no AI). */
  async claraNote(lang: "es" | "en"): Promise<ClaraNote | null> {
    const x = load();
    const now = new Date();
    const month = todayISO(now).slice(0, 7);
    const income = x.budgets.filter((b) => b.month <= month).sort((a, b) => b.month.localeCompare(a.month))[0]?.income_cents ?? 0;
    const since = todayISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 130));
    const d: ClaraData = {
      profile: x.profile,
      income,
      bills: x.bills,
      recipients: x.recipients,
      goals: x.goals,
      recent: x.entries.filter((e) => e.date >= since),
      business: businessEntries(x.entries, todayISO(now)),
      debts: x.debts ?? [],
      subscription: x.subscription ?? FREE,
      taxPct: taxPct(x.profile, x.subscription ?? FREE),
    };
    if (!hasNoteData(d, now)) return null;
    const week = noteWeek(now);
    return { id: `demo-${week}`, week, body: fallbackNote(d, lang, now), seen_at: x.noteSeen === week ? now.toISOString() : null };
  }
  async claraNoteSeen() {
    this.update((x) => {
      x.noteSeen = noteWeek();
    });
  }

  async claraDelete(id: string): Promise<boolean> {
    this.update((x) => {
      x.clara = x.clara.filter((c) => c.id !== id);
    });
    return true;
  }

  async deleteAccount() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nothing to remove
    }
  }
}
