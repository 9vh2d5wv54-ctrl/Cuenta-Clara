import { describe, expect, it } from "vitest";
import { monthlyFromPaycheck } from "@/lib/onboarding";

describe("monthly income from a paycheck", () => {
  it("uses paychecks per year, not 4 weeks a month", () => {
    expect(monthlyFromPaycheck(100000, "weekly")).toBe(433333); // $1,000 a week ≈ $4,333.33 a month
    expect(monthlyFromPaycheck(150000, "biweekly")).toBe(325000); // $1,500 every 2 weeks = $3,250
    expect(monthlyFromPaycheck(150000, "semimonthly")).toBe(300000); // twice a month
    expect(monthlyFromPaycheck(420000, "monthly")).toBe(420000);
  });
});
