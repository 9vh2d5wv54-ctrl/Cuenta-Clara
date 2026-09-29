import { describe, expect, it } from "vitest";
import { businessEntries, businessTotals, canBeBusiness, costsByCategory, loadSince, taxOnProfit } from "@/lib/business";
import { runClaraTool, type ClaraData } from "@/lib/clara-tools";
import type { Entry } from "@/lib/types";

let n = 0;
const e = (type: Entry["type"], cents: number, date: string, business = true, category = "supplies"): Entry => ({
  id: String(++n), user_id: "u", type, amount_cents: cents, category, recipient_id: null, date, note: null, business,
});

const entries = [
  e("income", 120000, "2026-09-05", true, "income"),
  e("income", 80000, "2026-08-20", true, "income"),
  e("expense", 15000, "2026-09-10", true, "supplies"),
  e("expense", 4000, "2026-09-12", true, "fees"),
  e("expense", 30000, "2026-03-01", true, "equipment"),
  e("expense", 9999, "2026-09-12", false, "food"), // personal: never counted
  e("send", 5000, "2026-09-12", true, "family"), // sends can't be business
  e("income", 50000, "2025-12-30", true, "income"), // last year
];

describe("business totals", () => {
  it("adds up income, costs and profit for a month and a year", () => {
    expect(businessTotals(entries, "2026-09")).toEqual({ income: 120000, costs: 19000, profit: 101000, count: 3 });
    expect(businessTotals(entries, "2026")).toEqual({ income: 200000, costs: 49000, profit: 151000, count: 5 });
    expect(businessTotals(entries, "2026-07")).toEqual({ income: 0, costs: 0, profit: 0, count: 0 });
  });
  it("shows a loss as negative profit", () => {
    expect(businessTotals([e("expense", 5000, "2026-01-02")], "2026").profit).toBe(-5000);
  });
  it("groups costs by category, biggest first", () => {
    expect(costsByCategory(entries, "2026")).toEqual([
      { category: "equipment", cents: 30000 },
      { category: "supplies", cents: 15000 },
      { category: "fees", cents: 4000 },
    ]);
  });
  it("sets aside tax on profit, never on a loss", () => {
    expect(taxOnProfit(151000, 25)).toBe(37750);
    expect(taxOnProfit(-5000, 25)).toBe(0);
  });
  it("only income, costs and paid bills can be business", () => {
    expect(["income", "expense", "bill_paid", "send", "savings"].map((t) => canBeBusiness(t as Entry["type"]))).toEqual([true, true, true, false, false]);
  });
  it("keeps this year's business entries, newest first", () => {
    const got = businessEntries(entries, "2026-09-29");
    expect(got.every((x) => x.business && x.date >= "2026-01-01")).toBe(true);
    expect(got[0].date >= got[got.length - 1].date).toBe(true);
    expect(got).toHaveLength(6);
  });
  it("loads from January 1 or 130 days back, whichever is earlier", () => {
    expect(loadSince(new Date(2026, 8, 29), 130)).toEqual(new Date(2026, 0, 1));
    expect(loadSince(new Date(2026, 1, 10), 130)).toEqual(new Date(2025, 9, 3));
  });
});

describe("Clara's get_business tool", () => {
  const base: ClaraData = {
    profile: { balance_cents: null, balance_on: null, buffer_cents: 0, payday_anchor: null, payday_cycle: null, pay_frequency: null, currency: "USD", business_on: true },
    income: 0, bills: [], recipients: [], goals: [], recent: [], debts: [], subscription: null, taxPct: 0,
    business: businessEntries(entries, "2026-09-29"),
  };
  const run = (d: ClaraData) => runClaraTool("get_business", {}, d, { lessons: [], words: [] }, "en", new Date(2026, 8, 29)) as Record<string, unknown>;

  it("returns month and year numbers from code", () => {
    const r = run(base);
    expect(r.this_month).toEqual({ income: "$1,200.00", costs: "$190.00", profit: "$1,010.00", lost_money: false });
    expect(r.this_year_so_far).toMatchObject({ profit: "$1,510.00" });
    expect(r).not.toHaveProperty("tax_set_aside_on_profit_this_year");
  });
  it("adds the tax set-aside on profit when it's on", () => {
    expect(run({ ...base, taxPct: 25 }).tax_set_aside_on_profit_this_year).toBe("$377.50");
  });
  it("says how to turn it on when Business mode is off", () => {
    const r = run({ ...base, profile: { ...base.profile!, business_on: false }, business: [] });
    expect(r.available).toBe(false);
  });
});
