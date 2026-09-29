import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CLARA_MODEL } from "./clara";
import { planIdFor, whopAccountId, whopClient } from "./whop";

// Server-only. The daily check that the paid path really works (payments, Clara,
// email, the database), so ads never run while something is silently broken.

export type Check = { name: string; ok: boolean; detail: string };

function why(err: unknown): string {
  if (err instanceof Anthropic.APIError) return `${err.status ?? ""} ${err.message}`.trim().slice(0, 160);
  const e = err as { statusCode?: number; status?: number; message?: string };
  return `${e?.statusCode ?? e?.status ?? ""} ${e?.message ?? String(err)}`.trim().slice(0, 160);
}

/** Plus plans at the right prices with the 7-day trial, and a checkout that can really open. */
async function payments(): Promise<Check[]> {
  if (!process.env.WHOP_API_KEY) return [{ name: "Payments (Whop)", ok: false, detail: "WHOP_API_KEY is missing" }];
  const out: Check[] = [];
  out.push({
    name: "Payment confirmations (webhook)",
    ok: Boolean(process.env.WHOP_WEBHOOK_SECRET),
    detail: process.env.WHOP_WEBHOOK_SECRET ? "Secret is set" : "WHOP_WEBHOOK_SECRET is missing: trials would never turn on Plus",
  });
  try {
    const account = await whopAccountId();
    for (const interval of ["monthly", "yearly"] as const) {
      const planId = await planIdFor(interval);
      if (!planId) {
        out.push({ name: `Plus ${interval} plan`, ok: false, detail: `No ${interval} plan at the app's price was found in Whop` });
        continue;
      }
      const plan = await whopClient().plans.retrieve({ id: planId });
      const trial = (plan as { trial_period_days?: number | null }).trial_period_days ?? null;
      const session = await whopClient().checkoutConfigurations.create({
        account_id: account,
        plan_id: planId,
        metadata: { health_check: "true" },
      });
      out.push({
        name: `Plus ${interval} plan`,
        ok: Boolean(session.id),
        detail: `$${plan.renewal_price} · ${trial ? `${trial}-day trial` : "no trial shown (fine if the checker already used it)"} · checkout opens`,
      });
    }
  } catch (err) {
    out.push({ name: "Payments (Whop)", ok: false, detail: why(err) });
  }
  return out;
}

/** Clara: the key works and the account still has credit (a one-word question, a fraction of a cent). */
async function clara(): Promise<Check> {
  if (!process.env.ANTHROPIC_API_KEY) return { name: "Clara (Claude)", ok: false, detail: "ANTHROPIC_API_KEY is missing" };
  try {
    const res = await new Anthropic().messages.create({
      model: CLARA_MODEL,
      max_tokens: 16,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: "Reply with the word ok." }],
    });
    return { name: "Clara (Claude)", ok: true, detail: `Answering (${res.stop_reason})` };
  } catch (err) {
    return { name: "Clara (Claude)", ok: false, detail: why(err) };
  }
}

/** Email: the Resend key works and the sending domain is verified. */
async function email(): Promise<Check> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { name: "Email (Resend)", ok: false, detail: "RESEND_API_KEY is missing" };
  try {
    const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) return { name: "Email (Resend)", ok: false, detail: `Resend answered ${res.status}` };
    const { data } = (await res.json()) as { data?: { name: string; status: string }[] };
    const domain = data?.find((d) => d.name === "micuentaclara.app");
    return domain?.status === "verified"
      ? { name: "Email (Resend)", ok: true, detail: "micuentaclara.app is verified" }
      : { name: "Email (Resend)", ok: false, detail: `micuentaclara.app is ${domain?.status ?? "not added"} in Resend` };
  } catch (err) {
    return { name: "Email (Resend)", ok: false, detail: why(err) };
  }
}

async function database(db: SupabaseClient): Promise<Check> {
  const { error } = await db.from("users").select("id", { count: "exact", head: true });
  return error ? { name: "Database (Supabase)", ok: false, detail: error.message.slice(0, 160) } : { name: "Database (Supabase)", ok: true, detail: "Reachable" };
}

export async function runHealthChecks(db: SupabaseClient): Promise<Check[]> {
  const [pay, ai, mail, data] = await Promise.all([payments(), clara(), email(), database(db)]);
  return [...pay, ai, mail, data];
}
