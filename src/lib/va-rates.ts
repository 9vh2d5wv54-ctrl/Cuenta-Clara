// VA monthly compensation rates, in cents. They change every December 1 (the
// cost-of-living increase), so they're copied exactly from the published table
// with the effective date, never estimated. Update each December from
// https://www.va.gov/disability/compensation-rates/veteran-rates/
//
// 30%–100% rows depend on spouse, dependent parents and children. 10% and 20%
// have one rate each (no dependents).

export const RATED = [30, 40, 50, 60, 70, 80, 90, 100] as const;

type Row = readonly [number, number, number, number, number, number, number, number]; // 30…100%

export type VaRates = {
  effective: string; // YYYY-MM-DD
  low: { 10: number | null; 20: number | null };
  /** [spouse ? 1 : 0][dependent parents 0|1|2] → monthly cents at 30…100%. */
  withoutChildren: readonly [readonly [Row, Row, Row], readonly [Row, Row, Row]];
  withChild: readonly [readonly [Row, Row, Row], readonly [Row, Row, Row]];
  addChildUnder18: Row;
  addSchoolChild: Row;
  addSpouseAidAttendance: Row;
};

const $ = (...dollars: number[]) => dollars.map((d) => Math.round(d * 100)) as unknown as Row;

export const VA_RATES: VaRates = {
  effective: "2025-12-01",
  low: { 10: 18042, 20: 35666 },
  withoutChildren: [
    [
      $(552.47, 795.84, 1132.9, 1435.02, 1808.45, 2102.15, 2362.3, 3938.58), // alone
      $(604.47, 865.84, 1220.9, 1540.02, 1931.45, 2242.15, 2520.3, 4114.82), // 1 parent
      $(656.47, 935.84, 1308.9, 1645.02, 2054.45, 2382.15, 2678.3, 4291.06), // 2 parents
    ],
    [
      $(617.47, 882.84, 1241.9, 1566.02, 1961.45, 2277.15, 2559.3, 4158.17), // spouse
      $(669.47, 952.84, 1329.9, 1671.02, 2084.45, 2417.15, 2717.3, 4334.41), // spouse + 1 parent
      $(721.47, 1022.84, 1417.9, 1776.02, 2207.45, 2557.15, 2875.3, 4510.65), // spouse + 2 parents
    ],
  ],
  withChild: [
    [
      $(596.47, 853.84, 1205.9, 1523.02, 1910.45, 2219.15, 2494.3, 4085.43), // child
      $(648.47, 923.84, 1293.9, 1628.02, 2033.45, 2359.15, 2652.3, 4261.67), // 1 parent + child
      $(700.47, 993.84, 1381.9, 1733.02, 2156.45, 2499.15, 2810.3, 4437.91), // 2 parents + child
    ],
    [
      $(666.47, 947.84, 1322.9, 1663.02, 2074.45, 2406.15, 2704.3, 4318.99), // spouse + child
      $(718.47, 1017.84, 1410.9, 1768.02, 2197.45, 2546.15, 2862.3, 4495.23), // spouse + 1 parent + child
      $(770.47, 1087.84, 1498.9, 1873.02, 2320.45, 2686.15, 3020.3, 4671.47), // spouse + 2 parents + child
    ],
  ],
  addChildUnder18: $(32, 43, 54, 65, 76, 87, 98, 109.11),
  addSchoolChild: $(105, 140, 176, 211, 246, 281, 317, 352.45),
  addSpouseAidAttendance: $(61, 81, 101, 121, 141, 161, 181, 201.41),
};

export type Dependents = {
  spouse: boolean;
  spouseAidAttendance: boolean;
  parents: 0 | 1 | 2;
  childrenUnder18: number;
  schoolChildren: number; // 18–23 and in school
};

/**
 * Monthly compensation in cents, or null when the rate isn't loaded (10%/20%).
 * The "with child" row covers one child under 18; each more child under 18 adds
 * the child amount, and each child 18–23 in school adds the school-child amount.
 */
export function monthlyCompensation(rating: number, d: Dependents, rates: VaRates = VA_RATES): number | null {
  if (rating <= 0) return 0;
  if (rating === 10 || rating === 20) return rates.low[rating];
  const col = RATED.indexOf(rating as (typeof RATED)[number]);
  if (col < 0) return null;
  const spouse = d.spouse ? 1 : 0;
  const under18 = Math.max(0, Math.floor(d.childrenUnder18));
  const school = Math.max(0, Math.floor(d.schoolChildren));
  const base = under18 > 0 ? rates.withChild[spouse][d.parents][col] : rates.withoutChildren[spouse][d.parents][col];
  return (
    base +
    Math.max(0, under18 - 1) * rates.addChildUnder18[col] +
    school * rates.addSchoolChild[col] +
    (d.spouse && d.spouseAidAttendance ? rates.addSpouseAidAttendance[col] : 0)
  );
}
