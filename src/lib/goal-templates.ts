// Goal marketplace (free): pick a goal, answer one or two questions, get a plan
// (amount, monthly, date, steps) and save it as a goal. The math is simple and
// shown; rates of return and closing costs are stated assumptions, general
// information only, not financial advice.

export type TemplateId = "emergency" | "home" | "car" | "business" | "retire" | "debt";

export const TEMPLATES: TemplateId[] = ["emergency", "home", "car", "business", "retire", "debt"];

/** Home: down payment choices (share of price). 0 is for VA or USDA loans. */
export const DOWN_PAYMENTS = [0, 0.035, 0.05, 0.1, 0.2] as const;
export const CLOSING_COSTS = 0.03; // about 2–5% of the price; we use 3%
export const CAR_DOWN = 0.2;
export const RETIRE_RETURN = 0.05; // yearly, after inflation, an assumption
export const RETIRE_MULTIPLE = 25; // the "4% rule": 25 years of spending

export function monthsBetween(from: Date, to: string): number {
  const [y, m] = to.split("-").map(Number);
  return Math.max(1, (y - from.getFullYear()) * 12 + (m - 1 - from.getMonth()));
}

export function dateInMonths(months: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() + months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function emergencyTarget(monthlyFixed: number, months = 3): number {
  return monthlyFixed * months;
}

export function homeTarget(price: number, down: number): { down: number; closing: number; total: number } {
  const d = Math.round(price * down);
  const c = Math.round(price * CLOSING_COSTS);
  return { down: d, closing: c, total: d + c };
}

export function carTarget(price: number): number {
  return Math.round(price * CAR_DOWN);
}

export function businessTarget(startup: number, monthlyFixed: number): number {
  return startup + monthlyFixed * 3; // startup costs + 3 months of your own bills
}

/** Retire: 25× yearly spending, and the monthly saving that reaches it at 5% a year. */
export function retirePlan(monthlySpending: number, years: number): { target: number; monthly: number } {
  const target = monthlySpending * 12 * RETIRE_MULTIPLE;
  const r = RETIRE_RETURN / 12;
  const n = Math.max(1, Math.round(years * 12));
  return { target, monthly: Math.ceil((target * r) / (Math.pow(1 + r, n) - 1)) };
}

export function monthlyFor(target: number, months: number): number {
  return Math.ceil(target / Math.max(1, months));
}
