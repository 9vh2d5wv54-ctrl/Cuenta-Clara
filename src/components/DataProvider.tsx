"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { setAppCurrency } from "@/lib/money";
import { getStore, type Store } from "@/lib/store";
import { monthKey, todayISO } from "@/lib/dates";
import { businessEntries, loadSince } from "@/lib/business";
import { taxPct } from "@/lib/plan";
import type { Bill, Checkup, Debt, Entry, Goal, Profile, Recipient, Subscription } from "@/lib/types";

// Loads everything the app screens need for the current month and reloads after each change.

type Data = {
  store: Store;
  month: string;
  profile: Profile | null;
  income: number | null;
  bills: Bill[];
  recipients: Recipient[];
  entries: Entry[];
  /** The last 130 days of entries, across months, for paycheck mode and the tax set-aside. */
  recent: Entry[];
  /** Business mode: this year's business income and costs, newest first. */
  business: Entry[];
  goals: Goal[];
  debts: Debt[];
  subscription: Subscription | null;
  /** This month's checkup, if written. */
  checkup: Checkup | null;
  /** Any checkup ever: the paywall only shows after the first one. */
  hasCheckup: boolean;
  /** Tax set-aside percent in effect (Plus); 0 when off. */
  taxPct: number;
};

type Ctx = Data & {
  /** Run a change, then refresh. Throws if the change fails, so forms can show an error. */
  mutate: (fn: (store: Store) => Promise<unknown>) => Promise<void>;
};

const DataContext = createContext<Ctx | null>(null);

export function useData(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData outside DataProvider");
  return ctx;
}

async function loadAll(store: Store): Promise<Data> {
  const month = monthKey();
  const now = new Date();
  // Long enough for a whole IRS estimated-tax period (up to 4 months)…
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 130);
  // …and, in the same request, the whole year for Business mode.
  const [profile, budget, bills, recipients, entries, loaded, goals, debts, subscription, checkups] = await Promise.all([
    store.getProfile(),
    store.getBudget(month),
    store.listBills(),
    store.listRecipients(),
    store.listEntries(month),
    store.listEntriesSince(todayISO(loadSince(now, 130))),
    store.listGoals(),
    // Before the debts table exists (migration 006), the rest of the app still loads.
    store.listDebts().catch(() => [] as Debt[]),
    store.getSubscription(),
    store.listCheckups(),
  ]);
  return {
    store,
    month,
    profile,
    income: budget?.income_cents ?? null,
    bills,
    recipients,
    entries,
    recent: loaded.filter((e) => e.date >= todayISO(since)),
    business: businessEntries(loaded, todayISO(now)),
    goals,
    debts,
    subscription,
    checkup: checkups.find((c) => c.month === month) ?? null,
    hasCheckup: checkups.length > 0,
    taxPct: taxPct(profile, subscription),
  };
}

export function DataProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const store = await getStore();
      if (!(await store.currentUserId())) {
        router.replace("/login");
        return;
      }
      const loaded = await loadAll(store);
      if (!cancelled) setData(loaded);
      // The weekly email goes out Sunday 6 PM in each person's own timezone.
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (loaded.profile && tz && loaded.profile.timezone !== tz) {
        store.updateProfile({ timezone: tz }).catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const mutate = useCallback(
    async (fn: (store: Store) => Promise<unknown>) => {
      if (!data) return;
      await fn(data.store);
      setData(await loadAll(data.store));
    },
    [data],
  );

  if (!data) return <>{fallback}</>;
  // Every amount on screen uses the person's own currency.
  setAppCurrency(data.profile?.currency);
  return <DataContext.Provider value={{ ...data, mutate }}>{children}</DataContext.Provider>;
}
