import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthResult, Store } from "./store";
import { supabaseBrowser } from "./supabase-browser";
import type {
  Bill, Budget, Entry, Goal, NewBill, NewEntry, NewGoal, NewRecipient, Profile, Recipient,
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

  private async uid(): Promise<string> {
    const id = await this.currentUserId();
    if (!id) throw new Error("Not signed in");
    return id;
  }

  async currentUserId() {
    const { data } = await this.db.auth.getUser();
    return data.user?.id ?? null;
  }

  async signUp(email: string, password: string) {
    const { error } = await this.db.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    return fail(error);
  }
  async signIn(email: string, password: string) {
    const { error } = await this.db.auth.signInWithPassword({ email, password });
    return fail(error);
  }
  async sendMagicLink(email: string) {
    const { error } = await this.db.auth.signInWithOtp({
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
  async updateProfile(patch: Partial<Profile>) {
    must(await this.db.from("users").update(patch).eq("id", await this.uid()));
  }

  async getBudget(month: string) {
    return must(await this.db.from("budgets").select("*").eq("month", month).maybeSingle()) as Budget | null;
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

  async deleteAccount() {
    must(await this.db.rpc("delete_my_account"));
    await this.db.auth.signOut();
  }
}
