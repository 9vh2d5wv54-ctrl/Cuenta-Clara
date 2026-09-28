import { describe, expect, it } from "vitest";
import { formatUSD, parseCents } from "@/lib/money";
import { summarize, monthlySendCents } from "@/lib/budget";
import { taxCents } from "@/lib/taxes";
import { compare, expectedPay } from "@/lib/paystub";
import { household, NOW } from "./fixtures";

describe("money formatting", () => {
  it("formats cents as dollars", () => {
    expect(formatUSD(123456)).toBe("$1,234.56");
    expect(formatUSD(-500)).toBe("−$5.00");
    expect(formatUSD(0)).toBe("$0.00");
  });
  it("reads what people type", () => {
    expect(parseCents("1,250.5")).toBe(125050);
    expect(parseCents("$40")).toBe(4000);
    expect(parseCents("abc")).toBeNull();
    expect(parseCents("")).toBeNull();
  });
});

describe("the monthly plan", () => {
  it("left = income − bills − sends − savings − spending", () => {
    const d = household({ goals: [] });
    const s = summarize(d.income, d.bills, d.recipients, d.goals, d.recent, NOW);
    expect(s.bills).toBe(129000);
    expect(s.family).toBe(20000);
    expect(s.spending).toBe(4000);
    expect(s.left).toBe(300000 - 129000 - 20000 - 4000);
  });
  it("tax set-aside comes off the plan when on", () => {
    expect(taxCents(300000, 25)).toBe(75000);
    expect(taxCents(300000, 0)).toBe(0);
    const d = household({ goals: [] });
    expect(summarize(d.income, d.bills, d.recipients, d.goals, d.recent, NOW, 25).left).toBe(147000 - 75000);
  });
  it("counts a monthly send once a month", () => {
    expect(monthlySendCents(household().recipients[0])).toBe(20000);
  });
});

describe("pay stub check", () => {
  it("pays time and a half after 40 hours in a week", () => {
    const e = expectedPay(2000, [45]);
    expect(e.regular).toBe(80000);
    expect(e.overtime).toBe(15000);
    expect(e.total).toBe(95000);
  });
  it("gives each week its own overtime", () => {
    expect(expectedPay(2000, [45, 35]).overtimeHours).toBe(5);
  });
  it("calls it a match within $1, and says how short otherwise", () => {
    expect(compare(95000, 94950).status).toBe("match");
    expect(compare(95000, 90000)).toEqual({ status: "under", diff: 5000 });
  });
});
