// Post-9/11 GI Bill planner (veterans track, free). Rates copied from VA's
// published table with the effective dates, never estimated. Estimates only:
// VA decides actual benefits. Update every August 1 from
// https://www.va.gov/education/benefit-rates/post-9-11-gi-bill-rates/

export const GI_RATES = {
  effective: "2026-08-01",
  through: "2027-07-31",
  /** Private, foreign and non-college degree programs: yearly cap on net tuition and fees, in cents. */
  privateCap: 3_090_834,
  /** Flight training and correspondence school: yearly caps, in cents. No monthly housing for either. */
  flightCap: 1_766_189,
  correspondenceCap: 1_501_259,
  /** Books and supplies: per credit hour at a college (up to 24 credits, $1,000 a year), or per month for
   * non-college programs. None for flight training or correspondence school. */
  booksPerCredit: 4_167,
  booksMaxCredits: 24,
  booksYearCap: 100_000,
  booksPerMonthNonCollege: 8_300,
  /** Monthly housing at 100% for online-only classes (half the national average BAH) and for schools
   * outside the U.S., for people who started using the benefit on or after Jan 1, 2018. */
  onlineHousing: 126_100,
  foreignHousing: 252_200,
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

export type School = "public" | "private" | "trade" | "flight" | "correspondence";

export type GiPlan = {
  pct: number;
  tuitionCovered: number; // yearly, cents
  outOfPocket: number; // yearly, cents
  housingMonthly: number | null; // cents; null if not eligible or no BAH entered
  booksYearly: number | null; // college: per year; null for flight/correspondence
  booksMonthly: number | null; // trade school: per month
  yellowRibbon: boolean; // tuition above the cap at a private school
};

/**
 * tuition: the school's yearly net tuition and fees (in-state for public schools).
 * bah: the E-5 with-dependents BAH for the school's ZIP code, monthly cents.
 * online: all classes online (a fixed housing rate; one in-person class gets the school's BAH).
 * foreign: a school outside the U.S. (a fixed housing rate).
 * Housing needs more than half-time classes; this planner assumes full time.
 */
export function giPlan(opts: {
  pct: number;
  school: School;
  tuition: number;
  bah: number;
  activeDuty: boolean;
  credits?: number;
  online?: boolean;
  foreign?: boolean;
}): GiPlan {
  const share = opts.pct / 100;
  // VA pays your percentage of net tuition; private schools up to the yearly cap first.
  const cap =
    opts.school === "public"
      ? Infinity
      : opts.school === "private" || opts.school === "trade"
        ? GI_RATES.privateCap
        : opts.school === "flight"
          ? GI_RATES.flightCap
          : GI_RATES.correspondenceCap;
  const covered = Math.round(Math.min(opts.tuition, cap) * share);
  const noHousing = opts.activeDuty || opts.school === "flight" || opts.school === "correspondence";
  const rate = opts.online ? GI_RATES.onlineHousing : opts.foreign && opts.school === "private" ? GI_RATES.foreignHousing : opts.bah;
  const housing = noHousing || rate <= 0 || opts.pct === 0 ? null : Math.round(rate * share);
  const college = opts.school === "public" || opts.school === "private";
  const credits = Math.max(0, Math.min(GI_RATES.booksMaxCredits, opts.credits ?? GI_RATES.booksMaxCredits));
  const booksYearly = college ? Math.round(Math.min(credits * GI_RATES.booksPerCredit, GI_RATES.booksYearCap) * share) : null;
  const booksMonthly = opts.school === "trade" ? Math.round(GI_RATES.booksPerMonthNonCollege * share) : null;
  return {
    pct: opts.pct,
    tuitionCovered: covered,
    outOfPocket: Math.max(0, opts.tuition - covered),
    housingMonthly: housing,
    booksYearly,
    booksMonthly,
    yellowRibbon: opts.school === "private" && opts.tuition > GI_RATES.privateCap,
  };
}
