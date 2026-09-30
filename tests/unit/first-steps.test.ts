import { describe, expect, it } from "vitest";
import { firstStepsView } from "@/lib/first-steps";

const none = { setup: false, clara: false, log: false };
const all = { setup: true, clara: true, log: true };

describe("First 3 steps card", () => {
  it("shows the list to new accounts until they hide it", () => {
    expect(firstStepsView({ ageDays: 0, done: none, saved: null })).toBe("list");
    expect(firstStepsView({ ageDays: 5, done: { ...none, setup: true }, saved: "open" })).toBe("list");
    expect(firstStepsView({ ageDays: 5, done: none, saved: "closed" })).toBe("hidden");
  });
  it("is only for the first 30 days", () => {
    expect(firstStepsView({ ageDays: 31, done: none, saved: null })).toBe("hidden");
    expect(firstStepsView({ ageDays: null, done: none, saved: null })).toBe("hidden");
  });
  it("celebrates once for people who saw the list, never for people already done", () => {
    expect(firstStepsView({ ageDays: 2, done: all, saved: "open" })).toBe("celebrate");
    expect(firstStepsView({ ageDays: 2, done: all, saved: null })).toBe("hidden");
  });
});
