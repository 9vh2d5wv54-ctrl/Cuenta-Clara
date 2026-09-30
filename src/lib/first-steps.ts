// "Your first 3 steps" on Home: the same three things the tester invite asks for
// (set up, ask Clara, log something), checked off as they happen. Shown to new
// accounts only, and once all three are done it celebrates once and goes away.

export const FIRST_STEPS_DAYS = 30;
export const FIRST_STEPS = ["setup", "clara", "log"] as const;
export type FirstStep = (typeof FIRST_STEPS)[number];

export function firstStepsKey(userId: string): string {
  return `pr-first-steps-${userId}`;
}

/** Set on this device when Clara answers, so the step ticks even if the answer wasn't saved. */
export function askedClaraKey(userId: string): string {
  return `pr-asked-clara-${userId}`;
}

/** What the card shows: nothing, the checklist, or the one-time "all set". */
export function firstStepsView(input: {
  ageDays: number | null;
  done: Record<FirstStep, boolean>;
  /** Saved on this device: "open" once the checklist was shown, "closed" once dismissed. */
  saved: string | null;
}): "hidden" | "list" | "celebrate" {
  if (input.saved === "closed" || input.ageDays === null || input.ageDays > FIRST_STEPS_DAYS) return "hidden";
  const all = FIRST_STEPS.every((s) => input.done[s]);
  if (!all) return "list";
  // Only celebrate for someone who saw the list; people who were already done never see it.
  return input.saved === "open" ? "celebrate" : "hidden";
}
