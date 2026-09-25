import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AskResult, AuthResult, CheckoutStart, CheckupInput, EditableProfile, Store } from "./store";
import { supabaseBrowser } from "./supabase-browser";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "./supabase-env";
import type {
  Bill, Budget, Checkup, Entry, Goal, NewBill, NewEntry, NewGoal, NewRecipient, Profile, Recipient, Subscription,
} from "./types";

// Row-level security (supabase/schema.sql) limits every table to the signed-in
// user's rows, so queries here never need a user_id filter for safety; inserts
// still set it because the policies check it.

function fail(error: { message: string } | null): AuthResult {
  return error ? { ok: false, error: error.message } : { ok: true };
}

function must<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export class SupabaseStore implements Store {
  readonly mode = "supabase" as const;
  private db: SupabaseClient = supabaseBrowser();
  private ready = this.adoptLinkSession();

  // Login and confirm emails are sent in implicit mode, so the link carries the
  // session in the URL hash and works in any browser (Mail, Gmail, Safari).
  // The cookie client only speaks PKCE, so we hand the session over here.
  private async adoptLinkSession() {
    if (typeof window === "undefined") return;
    const hash = new URLSearchParams(location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (access_token && refresh_token) {
      history.replaceState(null, "", location.pathname + location.search);
      await this.db.auth.setSession({ access_token, refresh_token });
    } else if (hash.get("error")) {
      location.replace("/login?error=link");
    }
  }

  private mailer() {
    return createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
      auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  private async uid(): Promise<string> {
    const id = await this.currentUserId();
    if (!id) throw new Error("Not signed in");
    return id;
  }

  async currentUserId() {
    await this.ready;
    const { data } = await this.db.auth.getUser();
    return data.user?.id ?? null;
  }

  async signUp(email: string, password: string) {
    const { data, error } = await this.mailer().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    // No email confirmation needed: sign in right away.
    if (data.session) await this.db.auth.setSession(data.session);
    return fail(error);
  }
  async signIn(email: string, password: string) {
    const { error } = await this.db.auth.signInWithPassword({ email, password });
    return fail(error);
  }
  async sendMagicLink(email: string) {
    const { error } = await this.mailer().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    return fail(error);
  }
  async signOut() {
    await this.db.auth.signOut();
  }

  async getProfile() {
    return must(await this.db.from("users").select("*").maybeSingle()) as Profile | null;
  }
  async updateProfile(patch: EditableProfile) {
    must(await this.db.from("users").update(patch).eq("id", await this.uid()));
  }

  /** This month's budget, or the latest earlier one carried forward. */
  async getBudget(month: string) {
    return must(
      await this.db.from("budgets").select("*").lte("month", month).order("month", { ascending: false }).limit(1).maybeSingle(),
    ) as Budget | null;
  }
  async setIncome(month: string, cents: number) {
    must(
      await this.db
        .from("budgets")
        .upsert({ user_id: await this.uid(), month, income_cents: cents }, { onConflict: "user_id,month" }),
    );
  }

  async listBills() {
    return must(await this.db.from("bills").select("*").order("due_day")) as Bill[];
  }
  async addBill(b: NewBill) {
    must(await this.db.from("bills").insert({ ...b, user_id: await this.uid() }));
  }
  async deleteBill(id: string) {
    must(await this.db.from("bills").delete().eq("id", id));
  }

  async listRecipients() {
    return must(await this.db.from("recipients").select("*").order("name")) as Recipient[];
  }
  async addRecipient(r: NewRecipient) {
    must(await this.db.from("recipients").insert({ ...r, user_id: await this.uid() }));
  }
  async deleteRecipient(id: string) {
    must(await this.db.from("recipients").delete().eq("id", id));
  }

  async listEntries(month: string) {
    const [y, m] = month.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    return must(
      await this.db
        .from("entries")
        .select("*")
        .gte("date", `${month}-01`)
        .lt("date", `${next}-01`)
        .order("date", { ascending: false }),
    ) as Entry[];
  }
  async addEntry(e: NewEntry) {
    must(await this.db.from("entries").insert({ ...e, user_id: await this.uid() }));
  }
  async deleteEntry(id: string) {
    must(await this.db.from("entries").delete().eq("id", id));
  }

  async listGoals() {
    return must(await this.db.from("goals").select("*").order("target_date")) as Goal[];
  }
  async addGoal(g: NewGoal) {
    must(await this.db.from("goals").insert({ saved_cents: 0, ...g, user_id: await this.uid() }));
  }
  async addToGoal(id: string, cents: number) {
    must(await this.db.rpc("add_to_goal", { goal_id: id, amount: cents }));
  }
  async deleteGoal(id: string) {
    must(await this.db.from("goals").delete().eq("id", id));
  }

  async getCheckup(month: string) {
    return must(await this.db.from("checkups").select("*").eq("month", month).maybeSingle()) as Checkup | null;
  }
  async listCheckups() {
    return must(await this.db.from("checkups").select("*").order("month", { ascending: false })) as Checkup[];
  }
  async generateCheckup(input: CheckupInput) {
    const res = await fetch("/api/checkup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`checkup ${res.status}`);
    return (await res.json()) as Checkup;
  }

  async getSubscription() {
    return must(
      await this.db
        .from("subscriptions")
        .select("plan, status, trial_ends_at, renews_at, cancel_at_period_end")
        .maybeSingle(),
    ) as Subscription | null;
  }
  async cancelPlus() {
    const res = await fetch("/api/plus/cancel", { method: "POST" });
    return res.ok;
  }
  async ask(question: string, input: CheckupInput): Promise<AskResult> {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, input }),
    });
    if (res.status === 429) return { kind: "limit" };
    if (res.status === 402) return { kind: "plus_required" };
    if (!res.ok) return { kind: "error" };
    const body = (await res.json()) as { answer: string; remaining: number };
    return { kind: "answer", answer: body.answer, remaining: body.remaining };
  }

  async startCheckout(interval: "monthly" | "yearly"): Promise<CheckoutStart> {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { kind: "error", error: body.error ?? `status ${res.status}` };
    return { kind: "whop", sessionId: body.sessionId, planId: body.planId };
  }

  async deleteAccount() {
    must(await this.db.rpc("delete_my_account"));
    await this.db.auth.signOut();
  }
}
