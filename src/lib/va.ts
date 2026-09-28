// VA disability compensation (veterans track, free). Estimates only, never a
// decision on benefits, and never presented as the VA.
//
// Combined rating ("VA math"), 38 CFR 4.25: ratings aren't added. Start from a
// whole person (100% able); each rating, largest first, takes its percent of
// what's still able. Each step is rounded to the nearest whole number, like the
// regulation's Table I. The final value rounds to the nearest 10 (a 5 rounds up).
//
// Bilateral factor, 38 CFR 4.26: when disabilities affect both arms, both legs,
// or paired muscles, those ratings are combined first, 10% of that value is
// added, and the result is combined with the rest like one rating.

export type Rating = { percent: number; bilateral: boolean };

export const RATING_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

function combineTwo(combined: number, next: number): number {
  return Math.round(combined + ((100 - combined) * next) / 100);
}

/** Combines ratings largest first, the way Table I does. */
export function combineValues(values: number[]): number {
  return [...values].sort((a, b) => b - a).reduce((c, v) => combineTwo(c, v), 0);
}

export type Combined = {
  bilateralCombined: number | null; // bilateral ratings combined, before the 10%
  bilateralFactor: number | null; // the 10% added
  values: number[]; // what was combined in the end, largest first
  exact: number; // combined value before rounding to 10
  rating: number; // the combined rating VA would pay at (0–100, steps of 10)
};

export function combinedRating(ratings: Rating[]): Combined {
  const valid = ratings.filter((r) => r.percent > 0 && r.percent <= 100);
  const bilateral = valid.filter((r) => r.bilateral).map((r) => r.percent);
  const others = valid.filter((r) => !r.bilateral).map((r) => r.percent);

  let bilateralCombined: number | null = null;
  let bilateralFactor: number | null = null;
  const values = [...others];
  if (bilateral.length >= 2) {
    bilateralCombined = combineValues(bilateral);
    bilateralFactor = Math.round(bilateralCombined * 0.1 * 10) / 10;
    values.push(Math.round(bilateralCombined + bilateralFactor));
  } else {
    // A single "bilateral" rating has no pair; it combines like any other.
    values.push(...bilateral);
  }

  const exact = Math.min(100, combineValues(values));
  const rating = Math.min(100, Math.floor((exact + 5) / 10) * 10);
  return { bilateralCombined, bilateralFactor, values: [...values].sort((a, b) => b - a), exact, rating };
}
