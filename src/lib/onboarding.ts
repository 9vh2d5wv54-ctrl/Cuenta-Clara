import type { PaydayCycle } from "./safe-to-spend";

// First-run setup asks how people are actually paid (per paycheck), then turns
// it into the monthly income the budget uses.

export const PAYCHECKS_PER_YEAR: Record<PaydayCycle, number> = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };

/** A typical month's income from one paycheck amount. */
export function monthlyFromPaycheck(paycheckCents: number, cycle: PaydayCycle): number {
  return Math.round((paycheckCents * PAYCHECKS_PER_YEAR[cycle]) / 12);
}
