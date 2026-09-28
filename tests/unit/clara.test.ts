import { describe, expect, it } from "vitest";
import { CLARA_TOOLS, runClaraTool, type ClaraLinks } from "@/lib/clara-tools";
import { soundsLikeCrisis } from "@/lib/clara-safety";
import { claraAllowance, hasPlus } from "@/lib/plan";
import { parseCheckupInput } from "@/lib/checkup-input";
import { scoreStyle } from "@/lib/money-style";
import { household, NOW } from "./fixtures";

const links = (): ClaraLinks => ({ lessons: [], words: [] });
type R = Record<string, unknown>;

describe("Clara's tools", () => {
  it("every tool is strict with a closed schema", () => {
    for (const t of CLARA_TOOLS) {
      expect(t.strict).toBe(true);
      expect((t.input_schema as R).additionalProperties).toBe(false);
    }
  });
  it("check_purchase answers from Safe to Spend, in formatted dollars", () => {
    const r = runClaraTool("check_purchase", { amount: 600, what: "TV" }, household(), links(), "en", NOW) as R;
    expect(r.answer).toBe("no");
    expect(r.price).toBe("$600.00");
    expect(r.short_by).toBe("$690.00"); // safe: $1,500 − $1,290 bills − $200 send − $100 cushion = −$90; − $600
  });
  it("says what's missing instead of guessing", () => {
    const r = runClaraTool("get_safe_to_spend", {}, household({ profile: null }), links(), "en", NOW) as R;
    expect(r.available).toBe(false);
    const g = runClaraTool("get_goals", {}, household({ goals: [] }), links(), "en", NOW) as R;
    expect(g.available).toBe(false);
  });
  it("what_if extra debt payment reports months sooner and interest saved", () => {
    const r = runClaraTool("what_if", { scenario: "extra_debt_payment_each_month", amount: 100, when: "now", what: "" }, household(), links(), "en", NOW) as R;
    expect(r.months_sooner).toBe(40);
  });
  it("lesson and word links show under the answer", () => {
    const l = links();
    runClaraTool("suggest_lesson", { slug: "apr" }, household(), l, "es", NOW);
    runClaraTool("define_word", { id: "apr" }, household(), l, "es", NOW);
    expect(l.lessons.map((x) => x.slug)).toEqual(["apr"]);
    expect(l.words.map((x) => x.id)).toEqual(["apr"]);
  });
  it("attaches the What if? chart when a balance and payday exist", () => {
    const l = links();
    runClaraTool("check_purchase", { amount: 50, what: "shoes" }, household(), l, "en", NOW);
    expect(l.chart?.days.length).toBe(91);
  });
  it("unknown tools return an error, not a crash", () => {
    expect((runClaraTool("nope", {}, household(), links(), "en", NOW) as R).error).toBeTruthy();
  });
});

describe("crisis safety net", () => {
  it.each(["I want to die", "no quiero vivir así", "thinking about suicide", "quiero quitarme la vida"])("catches %s", (t) => {
    expect(soundsLikeCrisis(t)).toBe(true);
  });
  it.each(["¿Me alcanza para $600?", "this debt is killing me", "What is APR?"])("doesn't flag %s", (t) => {
    expect(soundsLikeCrisis(t)).toBe(false);
  });
});

describe("limits and plans", () => {
  it("Free: 3 Clara questions a month; Plus: 30 a day", () => {
    expect(claraAllowance(false, "2026-09-28")).toEqual({ limit: 3, per: "month", since: "2026-09-01" });
    expect(claraAllowance(true, "2026-09-28")).toEqual({ limit: 30, per: "day", since: "2026-09-28" });
  });
  it("Plus is active only while trialing or active", () => {
    const sub = { plan: "plus" as const, status: "canceled" as const, trial_ends_at: null, renews_at: null, cancel_at_period_end: false };
    expect(hasPlus(sub)).toBe(false);
    expect(hasPlus({ ...sub, status: "trialing" })).toBe(true);
    expect(hasPlus(null)).toBe(false);
  });
  it("the checkup only accepts the current month", () => {
    const base = { language: "es", income_cents: 1, rent_cents: 1, bills_cents: 1, family_cents: 1, savings_cents: 1, spending_cents: 1, left_cents: 1 };
    expect(parseCheckupInput({ ...base, month: new Date().toISOString().slice(0, 7) })).not.toBeNull();
    expect(parseCheckupInput({ ...base, month: "2019-01" })).toBeNull();
  });
});

describe("Money Style quiz", () => {
  it("picks the most-chosen style and notes a strong second", () => {
    const r = scoreStyle(["saver", "saver", "saver", "saver", "saver", "giver", "giver", "giver"]);
    expect(r.style).toBe("saver");
    expect(r.also).toBe("giver");
  });
});
