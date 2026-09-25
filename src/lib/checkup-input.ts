import type { CheckupInput } from "./store";

const CENTS = ["income_cents", "rent_cents", "bills_cents", "family_cents", "savings_cents", "spending_cents", "left_cents"] as const;

/** Validates the totals a browser sends. They only shape that person's own text. */
export function parseCheckupInput(body: unknown): CheckupInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.language !== "es" && b.language !== "en") return null;
  if (typeof b.month !== "string" || !/^\d{4}-\d{2}$/.test(b.month)) return null;
  for (const k of CENTS) {
    if (typeof b[k] !== "number" || !Number.isInteger(b[k]) || Math.abs(b[k] as number) > 1e10) return null;
  }
  return b as unknown as CheckupInput;
}
