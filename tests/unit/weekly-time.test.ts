import { afterEach, describe, expect, it } from "vitest";
import { isSunday6pm, weeklyMode } from "@/lib/weekly-time";

// Sunday Oct 4, 2026. New York is UTC-4 (daylight time), London UTC+1, LA UTC-7.
const utc = (d: number, h: number) => new Date(Date.UTC(2026, 9, d, h, 20));

describe("Sunday 6 PM in each person's timezone", () => {
  it("finds 6 PM in New York, London, Los Angeles and Santo Domingo", () => {
    expect(isSunday6pm("America/New_York", utc(4, 22))).toBe(true);
    expect(isSunday6pm("America/New_York", utc(4, 21))).toBe(false);
    expect(isSunday6pm("Europe/London", utc(4, 17))).toBe(true);
    expect(isSunday6pm("America/Los_Angeles", utc(5, 1))).toBe(true); // Monday 01:00 UTC
    expect(isSunday6pm("America/Santo_Domingo", utc(4, 22))).toBe(true);
    expect(isSunday6pm("America/Toronto", utc(4, 22))).toBe(true);
  });
  it("treats a missing or unknown timezone as New York", () => {
    expect(isSunday6pm(null, utc(4, 22))).toBe(true);
    expect(isSunday6pm("Not/AZone", utc(4, 22))).toBe(true);
    expect(isSunday6pm("", utc(4, 15))).toBe(false);
  });
  it("is never true on another weekday", () => {
    expect(isSunday6pm("America/New_York", utc(5, 22))).toBe(false);
  });
});

describe("weekly mode", () => {
  const before = process.env.WEEKLY_LOCAL_TIME;
  afterEach(() => {
    if (before === undefined) delete process.env.WEEKLY_LOCAL_TIME;
    else process.env.WEEKLY_LOCAL_TIME = before;
  });
  it("is each person's own time unless turned off", () => {
    delete process.env.WEEKLY_LOCAL_TIME;
    expect(weeklyMode()).toBe("local");
    process.env.WEEKLY_LOCAL_TIME = "false";
    expect(weeklyMode()).toBe("single");
  });
});
