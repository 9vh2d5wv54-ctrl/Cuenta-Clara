// Post-9/11 GI Bill planner (veterans track, free). Rates copied from VA's
// published table with the effective dates, never estimated. Estimates only:
// VA decides actual benefits. Update every August 1 from
// https://www.va.gov/education/benefit-rates/post-9-11-gi-bill-rates/

export const GI_RATES = {
  effective: "2026-08-01",
  through: "2027-07-31",
  /** Private, foreign and non-college degree programs: yearly cap on net tuition and fees, in cents. */
  privateCap: 3_090_834,
  /** Books and supplies stipend and online-only housing: not copied yet (null = link to VA). */
  books: null as number | null,
  onlineHousing: null as number | null,
};

/** Eligibility tier by days of active duty after Sept 10, 2001 (VA's table). */
export const TIERS = [
  { minDays: 1095, pct: 100 },
  { minDays: 910, pct: 90 },
  { minDays: 730, pct: 80 },
  { minDays: 545, pct: 70 },
  { minDays: 180, pct: 60 },
  { minDays: 90, pct: 50 },
] as const;

export function tierFor(days: number, purpleHeartOrDisability: boolean): number {
  if (purpleHeartOrDisability) return 100;
  return TIERS.find((t) => days >= t.minDays)?.pct ?? 0;
}

export type School = "public" | "private";

export type GiPlan = {
  pct: number;
  tuitionCovered: number; // yearly, cents
  outOfPocket: number; // yearly, cents
  housingMonthly: number | null; // cents; null if not eligible or no BAH entered
};

/**
 * tuition: the school's yearly net tuition and fees (in-state for public schools).
 * bah: the E-5 with-dependents BAH for the school's ZIP code, monthly cents.
 * Housing needs more than half-time, in-person classes; this planner assumes full time.
 */
export function giPlan(opts: { pct: number; school: School; tuition: number; bah: number; activeDuty: boolean }): GiPlan {
  const share = opts.pct / 100;
  // VA pays your percentage of net tuition; private schools up to the yearly cap first.
  const base = opts.school === "public" ? opts.tuition : Math.min(opts.tuition, GI_RATES.privateCap);
  const covered = Math.round(base * share);
  const housing = opts.activeDuty || opts.bah <= 0 || opts.pct === 0 ? null : Math.round(opts.bah * share);
  return { pct: opts.pct, tuitionCovered: covered, outOfPocket: Math.max(0, opts.tuition - covered), housingMonthly: housing };
}
