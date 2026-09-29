import { AsyncLocalStorage } from "node:async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAppCurrency, type AppCurrency } from "./money";

// Server only: which currency money is formatted in while handling one person
// (a Clara answer, an email, a WhatsApp reply). Scoped per request, so two
// people handled at the same time never mix.

const scope = new AsyncLocalStorage<AppCurrency>();
(globalThis as { __ccCurrencyScope?: () => AppCurrency | undefined }).__ccCurrencyScope = () => scope.getStore();

export function inCurrency<T>(currency: unknown, fn: () => T): T {
  return scope.run(isAppCurrency(currency) ? currency : "USD", fn);
}

/** The person's currency; US dollars if unset or before the currency column exists. */
export async function currencyFor(db: SupabaseClient, userId: string): Promise<AppCurrency> {
  const { data, error } = await db.from("users").select("currency").eq("id", userId).maybeSingle();
  if (error) return "USD";
  const value = (data as { currency?: unknown } | null)?.currency;
  return isAppCurrency(value) ? value : "USD";
}
