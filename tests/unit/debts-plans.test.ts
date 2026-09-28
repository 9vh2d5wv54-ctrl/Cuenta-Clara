import { describe, expect, it } from "vitest";
import { simulate } from "@/lib/debts";
import { whatIfChart, lowest } from "@/lib/what-if";
import { paydayPlan, paydayPlanTomorrow } from "@/lib/payday-plan";
import { household, NOW } from "./fixtures";

const visa = household().debts;

describe("debt payoff", () => {
  it("minimums only take years; $100 more a month saves a lot", () => {
    const base = simulate(visa, "avalanche", 0);
    const extra = simulate(visa, "avalanche", 10000);
    expect(base.months).toBe(58);
    expect(extra.months).toBe(18);
    expect(extra.interest).toBeLessThan(base.interest);
  });
  it("snowball pays the smallest balance first", () => {
    const debts = [
      { ...visa[0], id: "a", name: "Big", balance_cents: 500000, apr: 10 },
      { ...visa[0], id: "b", name: "Small", balance_cents: 50000, apr: 5 },
    ];
    const plan = simulate(debts, "snowball", 5000);
    const small = plan.debts.find((d) => d.name === "Small")!;
    const big = plan.debts.find((d) => d.name === "Big")!;
    expect(small.paidOffMonth!).toBeLessThan(big.paidOffMonth!);
  });
});

describe("What if? chart", () => {
  it("starts from the balance and dips when rent comes before payday", () => {
    const d = household({ goals: [], profile: { ...household().profile!, payday_anchor: "2026-10-02" } });
    const c = whatIfChart(d, { scenario: "spend_once", amount: 60000, label: "TV" }, NOW)!;
    expect(c.days[0].planned).toBe(150000 - 20000); // balance typed today, minus the send still to go
    expect(c.days[0].withIt).toBe(c.days[0].planned - 60000);
    const low = lowest(c, 30);
    expect(low.planned.date).toBe("2026-10-01"); // rent day, before the Oct 2 payday
    expect(low.withIt.withIt).toBe(low.planned.planned - 60000);
  });
  it("waiting until payday moves the purchase to payday", () => {
    const d = household({ profile: { ...household().profile!, payday_anchor: "2026-10-02" } });
    const c = whatIfChart(d, { scenario: "spend_once", amount: 60000, label: "TV", when: "next_payday" }, NOW)!;
    const payIdx = c.days.findIndex((x) => x.payday);
    expect(c.days[payIdx - 1].withIt).toBe(c.days[payIdx - 1].planned);
    expect(c.days[payIdx].withIt).toBe(c.days[payIdx].planned - 60000);
  });
  it("needs a balance and a payday", () => {
    expect(whatIfChart(household({ profile: null }), { scenario: "spend_once", amount: 100, label: "" }, NOW)).toBeNull();
  });
});

describe("payday plan email", () => {
  const d = household({ goals: [], profile: { ...household().profile!, payday_anchor: "2026-09-29" } });
  it("only goes out the day before payday", () => {
    expect(paydayPlanTomorrow(d, NOW)?.payday).toBe("2026-09-29");
    expect(paydayPlanTomorrow(d, new Date(2026, 8, 25, 12))).toBeNull();
  });
  it("with a fresh balance: balance + paycheck − bills actually due", () => {
    const p = paydayPlan(d, "2026-10-02", "biweekly", new Date(2026, 9, 1, 12));
    expect(p.mode).toBe("due");
    expect(p.paycheck).toBe(Math.round((300000 * 12) / 26));
    expect(p.bills.map((b) => b.name)).toEqual([]); // rent was due Oct 1, power Sep 30: before this paycheck
  });
  it("without a fresh balance: this paycheck's share of the month's bills", () => {
    const stale = household({ goals: [], profile: { ...household().profile!, balance_on: "2026-07-01" } });
    const p = paydayPlan(stale, "2026-10-02", "biweekly", new Date(2026, 9, 1, 12));
    expect(p.mode).toBe("share");
    expect(p.billsTotal).toBe(Math.round((129000 * 12) / 26));
  });
});
