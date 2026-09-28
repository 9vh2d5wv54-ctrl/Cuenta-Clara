import { describe, expect, it } from "vitest";
import { combinedRating } from "@/lib/va";
import { monthlyCompensation } from "@/lib/va-rates";
import { giPlan, GI_RATES, tierFor } from "@/lib/gi-bill";

const alone = { spouse: false, spouseAidAttendance: false, parents: 0 as const, childrenUnder18: 0, schoolChildren: 0 };

describe("VA combined rating (38 CFR 4.25)", () => {
  it("doesn't add ratings: 50% and 30% make 65%, paid at 70%", () => {
    const r = combinedRating([{ percent: 50, bilateral: false }, { percent: 30, bilateral: false }]);
    expect(r.exact).toBe(65);
    expect(r.rating).toBe(70);
  });
  it("combines largest first and rounds at the end", () => {
    const r = combinedRating([20, 60, 40].map((percent) => ({ percent, bilateral: false })));
    expect(r.exact).toBe(81);
    expect(r.rating).toBe(80);
  });
  it("adds the bilateral factor (4.26)", () => {
    const r = combinedRating([{ percent: 30, bilateral: true }, { percent: 20, bilateral: true }]);
    expect(r.bilateralCombined).toBe(44);
    expect(r.bilateralFactor).toBe(4.4);
    expect(r.rating).toBe(50);
  });
});

describe("VA monthly compensation (rates effective Dec 1, 2025)", () => {
  it("matches VA's table", () => {
    expect(monthlyCompensation(10, alone)).toBe(18042);
    expect(monthlyCompensation(30, alone)).toBe(55247);
    expect(monthlyCompensation(100, alone)).toBe(393858);
    expect(monthlyCompensation(70, { ...alone, spouse: true, childrenUnder18: 1 })).toBe(207445);
  });
});

describe("GI Bill planner (rates Aug 1, 2026 – Jul 31, 2027)", () => {
  it("sets the tier by days of service", () => {
    expect(tierFor(1095, false)).toBe(100);
    expect(tierFor(600, false)).toBe(70);
    expect(tierFor(60, false)).toBe(0);
    expect(tierFor(60, true)).toBe(100);
  });
  it("caps private tuition and points to Yellow Ribbon", () => {
    const p = giPlan({ pct: 100, school: "private", tuition: 5_000_000, bah: 0, activeDuty: false });
    expect(p.tuitionCovered).toBe(GI_RATES.privateCap);
    expect(p.yellowRibbon).toBe(true);
    expect(p.booksYearly).toBe(100000);
  });
  it("prorates books and online-only housing by the tier", () => {
    expect(giPlan({ pct: 70, school: "public", tuition: 0, bah: 0, activeDuty: false, credits: 12 }).booksYearly).toBe(35003);
    expect(giPlan({ pct: 70, school: "public", tuition: 0, bah: 250000, activeDuty: false, online: true }).housingMonthly).toBe(88270);
  });
  it("pays no housing on active duty or for flight school", () => {
    expect(giPlan({ pct: 100, school: "public", tuition: 0, bah: 250000, activeDuty: true }).housingMonthly).toBeNull();
    expect(giPlan({ pct: 100, school: "flight", tuition: 0, bah: 250000, activeDuty: false }).housingMonthly).toBeNull();
  });
});
