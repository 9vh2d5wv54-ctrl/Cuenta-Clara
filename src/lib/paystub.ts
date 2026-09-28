// Paycheck checker (Plus): does the pay match the hours? The app does all the
// math; Claude only reads the pay stub photo. Federal rule (FLSA): time and a
// half for hours over 40 in a workweek. Some states pay more (California's daily
// overtime, for example); the screen says so. General information, not legal advice.

export const OVERTIME_AFTER = 40;
export const OVERTIME_RATE = 1.5;

export type Expected = {
  regularHours: number;
  overtimeHours: number;
  regular: number; // cents
  overtime: number; // cents
  total: number; // cents
};

/** Expected gross pay for these weeks at this hourly rate (cents). Each week gets its own overtime. */
export function expectedPay(rateCents: number, weeks: number[]): Expected {
  let regularHours = 0;
  let overtimeHours = 0;
  for (const h of weeks) {
    const hours = Math.max(0, h);
    regularHours += Math.min(hours, OVERTIME_AFTER);
    overtimeHours += Math.max(0, hours - OVERTIME_AFTER);
  }
  const regular = Math.round(rateCents * regularHours);
  const overtime = Math.round(rateCents * OVERTIME_RATE * overtimeHours);
  return { regularHours, overtimeHours, regular, overtime, total: regular + overtime };
}

export type Verdict = { status: "match" | "under" | "over"; diff: number };

/** Compares expected with what the stub shows. Within $1 counts as a match (rounding). */
export function compare(expectedCents: number, paidCents: number): Verdict {
  const diff = paidCents - expectedCents;
  if (Math.abs(diff) <= 100) return { status: "match", diff: 0 };
  return diff < 0 ? { status: "under", diff: -diff } : { status: "over", diff };
}

/** Overtime paid at less than time and a half, when the stub shows an overtime rate. */
export function lowOvertimeRate(rateCents: number, overtimeRateCents: number): boolean {
  return overtimeRateCents > 0 && rateCents > 0 && overtimeRateCents < Math.round(rateCents * OVERTIME_RATE) - 1;
}

/** What Claude reads off a pay stub. 0 or "" means the stub didn't show it. */
export type StubReading = {
  hourly_rate: number; // dollars
  regular_hours: number;
  overtime_hours: number;
  overtime_rate: number; // dollars
  gross_pay: number; // dollars
  net_pay: number; // dollars
  period_start: string;
  period_end: string;
  employer: string;
};

export function cleanReading(raw: unknown): StubReading | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, max: number) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n * 100) / 100 : 0;
  };
  const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  return {
    hourly_rate: num(r.hourly_rate, 1000),
    regular_hours: num(r.regular_hours, 200),
    overtime_hours: num(r.overtime_hours, 200),
    overtime_rate: num(r.overtime_rate, 1500),
    gross_pay: num(r.gross_pay, 100_000),
    net_pay: num(r.net_pay, 100_000),
    period_start: date(r.period_start),
    period_end: date(r.period_end),
    employer: typeof r.employer === "string" ? r.employer.trim().slice(0, 60) : "",
  };
}
