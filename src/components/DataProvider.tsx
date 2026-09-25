"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getStore, type Store } from "@/lib/store";
import { monthKey } from "@/lib/dates";
import type { Bill, Checkup, Entry, Goal, Profile, Recipient, Subscription } from "@/lib/types";

// Loads everything the app screens need for the current month and reloads after each change.

type Data = {
  store: Store;
  month: string;
  profile: Profile | null;
  income: number | null;
  bills: Bill[];
  recipients: Recipient[];
  entries: Entry[];
  goals: Goal[];
  subscription: Subscription | null;
  /** This month's checkup, if written. */
  checkup: Checkup | null;
  /** Any checkup ever: the paywall only shows after the first one. */
  hasCheckup: boolean;
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
  const [profile, budget, bills, recipients, entries, goals, subscription, checkups] = await Promise.all([
    store.getProfile(),
    store.getBudget(month),
    store.listBills(),
    store.listRecipients(),
    store.listEntries(month),
    store.listGoals(),
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
    goals,
    subscription,
    checkup: checkups.find((c) => c.month === month) ?? null,
    hasCheckup: checkups.length > 0,
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
  return <DataContext.Provider value={{ ...data, mutate }}>{children}</DataContext.Provider>;
}
