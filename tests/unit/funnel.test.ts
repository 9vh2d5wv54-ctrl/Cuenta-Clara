import { describe, expect, it } from "vitest";
import { computeFunnel } from "@/lib/funnel";

const u = (id: string, created_at: string, email = `${id}@x.com`) => ({ id, email, created_at });
const input = {
  users: [
    u("a", "2026-09-01T00:00:00Z"),
    u("b", "2026-09-20T00:00:00Z"),
    u("c", "2026-09-21T00:00:00Z"),
    u("d", "2026-09-22T00:00:00Z"),
    u("e", "2026-09-23T00:00:00Z"),
    u("f", "2026-09-24T00:00:00Z"),
    u("me", "2026-09-25T00:00:00Z", "owner@x.com"),
  ],
  setUp: new Set(["a", "b", "c", "d", "me"]),
  logged: new Set(["a", "b", "c", "me"]),
  askedClara: new Set(["b", "me"]),
  trial: new Set(["b"]),
  paying: new Set<string>(),
};
const tester = (email: string) => email === "owner@x.com";

describe("funnel", () => {
  it("counts each step for the sign-ups in the window, without testers", () => {
    const { steps, testers } = computeFunnel(input, "2026-09-15T00:00:00Z", tester);
    expect(steps.map((s) => s.count)).toEqual([5, 3, 2, 1, 1, 0]);
    expect(testers).toBe(1);
    expect(steps[1].ofStart).toBeCloseTo(0.6);
    expect(steps[2].ofPrevious).toBeCloseTo(2 / 3);
  });

  it("with no window, counts everyone", () => {
    expect(computeFunnel(input, null, tester).steps[0].count).toBe(6);
  });

  it("points at the biggest drop once there are at least 5 sign-ups", () => {
    const { worst } = computeFunnel(input, "2026-09-15T00:00:00Z", tester);
    expect(worst?.to).toBe("Paying for Plus");
    expect(computeFunnel({ ...input, users: input.users.slice(0, 3) }, null, tester).worst).toBeNull();
  });

  it("never divides by zero", () => {
    const { steps } = computeFunnel({ ...input, users: [] }, null, tester);
    expect(steps.every((s) => s.ofStart === 0 && s.ofPrevious === 0)).toBe(true);
  });
});
