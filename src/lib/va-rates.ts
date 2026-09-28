// VA monthly compensation rates. They change every December 1, so they are
// copied from VA's published table (https://www.va.gov/disability/compensation-rates/veteran-rates/)
// with the effective date, never estimated. Until they're filled in, the
// calculator shows the combined rating and links to VA's table for the amount.

export type VaRates = {
  effective: string; // YYYY-MM-DD
  source: string;
  /** Veteran alone, monthly cents, by combined rating. */
  alone: Record<number, number>;
};

export const VA_RATES: VaRates | null = null;
