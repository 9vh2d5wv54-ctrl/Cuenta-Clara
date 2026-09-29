import { describe, expect, it } from "vitest";
import { fallbackNote, hasNoteData, noteFacts, noteWeek, spendingWeek } from "@/lib/clara-note";
import type { ClaraData } from "@/lib/clara-tools";
import type { Entry } from "@/lib/types";

let n = 0;
const e = (type: Entry["type"], cents: number, date: string, category = "food", business = false): Entry => ({
  id: String(++n), user_id: "u", type, amount_cents: cents, category, recipient_id: null, date, note: null, business,
});
const NOW = new Date(2026, 8, 27, 18); // Sunday Sep 27, 2026, 6 PM

const base: ClaraData = {
  profile: { balance_cents: null, balance_on: null, buffer_cents: 0, payday_anchor: null, payday_cycle: null, pay_frequency: null, currency: "USD", business_on: false },
  income: 320000,
  bills: [{ id: "b", user_id: "u", name: "Rent", amount_cents: 120000, due_day: 1 } as ClaraData["bills"][number]],
  recipients: [],
  goals: [],
  recent: [
    e("expense", 4000, "2026-09-26"),
    e("expense", 6000, "2026-09-24", "transport"),
    e("expense", 15000, "2026-09-18"),
    e("expense", 999, "2026-09-25", "supplies", true), // business: not everyday spending
  ],
  debts: [],
  subscription: null,
  taxPct: 0,
};

describe("weekly note facts", () => {
  it("keys notes by the Sunday that starts the week", () => {
    expect(noteWeek(NOW)).toBe("2026-09-27");
    expect(noteWeek(new Date(2026, 8, 30))).toBe("2026-09-27");
  });
  it("compares the last 7 days with the 7 before, leaving business costs out", () => {
    expect(spendingWeek(base, NOW)).toEqual({ thisWeek: 10000, lastWeek: 15000, count: 2, lastCount: 1, top: { category: "transport", cents: 6000 } });
  });
  it("gives Clara only numbers the app computed", () => {
    const facts = noteFacts(base, NOW).join("\n");
    expect(facts).toContain("last 7 days: $100.00, $50.00 less than the week before ($150.00)");
    expect(facts).toContain("Biggest category this week: transport ($60.00)");
    expect(facts).toContain("Left this month");
    expect(facts).toContain("Rent $1,200.00 (2026-10-01)");
  });
  it("adds the business when Business mode is on", () => {
    const d = { ...base, profile: { ...base.profile!, business_on: true }, business: [e("income", 50000, "2026-09-10", "income", true), e("expense", 999, "2026-09-25", "supplies", true)] };
    expect(noteFacts(d, NOW).join("\n")).toContain("Business this month: came in $500.00, costs $9.99, kept $490.01");
  });
  it("writes a plain note without AI", () => {
    expect(fallbackNote(base, "en", NOW)).toBe(
      "You spent $100.00 on everyday things this week, $50.00 less than the week before. This week, log each purchase the same day so your numbers stay clear.",
    );
    expect(fallbackNote(base, "es", NOW)).toContain("$50.00 menos que la semana anterior");
  });
  it("skips empty accounts", () => {
    expect(hasNoteData({ ...base, income: 0, bills: [], recent: [] }, NOW)).toBe(false);
    expect(hasNoteData(base, NOW)).toBe(true);
  });
});
