// The sign-up funnel for the private dashboard: of the people who signed up in a
// window, how many reached each step. Pure, so it's tested without a database.

export type FunnelInput = {
  users: { id: string; email: string; created_at: string }[];
  setUp: Set<string>; // entered income or a bill
  logged: Set<string>; // logged at least one entry
  askedClara: Set<string>; // asked Clara at least once
  trial: Set<string>; // started a Plus trial (or paid right away)
  paying: Set<string>; // Plus and active today
};

export type FunnelStep = { key: string; label: string; count: number; ofStart: number; ofPrevious: number };

export const FUNNEL_STEPS = [
  { key: "signedUp", label: "Signed up" },
  { key: "setUp", label: "Set up income or a bill" },
  { key: "logged", label: "Logged something" },
  { key: "askedClara", label: "Asked Clara" },
  { key: "trial", label: "Started a Plus trial" },
  { key: "paying", label: "Paying for Plus" },
] as const;

/** The funnel for people who signed up on or after `since` (ISO), leaving out tester accounts. */
export function computeFunnel(input: FunnelInput, since: string | null, isTester: (email: string) => boolean) {
  const cohort = input.users.filter((u) => (!since || u.created_at >= since) && !isTester(u.email));
  const testers = input.users.filter((u) => (!since || u.created_at >= since) && isTester(u.email)).length;
  const ids = cohort.map((u) => u.id);
  const counts: Record<string, number> = {
    signedUp: ids.length,
    setUp: ids.filter((id) => input.setUp.has(id)).length,
    logged: ids.filter((id) => input.logged.has(id)).length,
    askedClara: ids.filter((id) => input.askedClara.has(id)).length,
    trial: ids.filter((id) => input.trial.has(id)).length,
    paying: ids.filter((id) => input.paying.has(id)).length,
  };
  const start = counts.signedUp;
  const steps: FunnelStep[] = FUNNEL_STEPS.map((s, i) => {
    const count = counts[s.key];
    const prev = i === 0 ? count : counts[FUNNEL_STEPS[i - 1].key];
    return { key: s.key, label: s.label, count, ofStart: start ? count / start : 0, ofPrevious: prev ? count / prev : 0 };
  });
  // The biggest drop between two steps (where to look first), once there's enough to go on.
  const drops = steps.slice(1).map((s, i) => ({ from: steps[i].label, to: s.label, lost: steps[i].count - s.count, rate: s.ofPrevious }));
  const worst = start >= 5 ? drops.filter((d) => d.lost > 0).sort((a, b) => a.rate - b.rate)[0] ?? null : null;
  return { steps, testers, worst };
}
