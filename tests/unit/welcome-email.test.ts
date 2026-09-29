import { describe, expect, it } from "vitest";
import { needsNudge, welcomeEmail } from "@/lib/welcome-email";

const now = new Date("2026-09-30T14:00:00Z");
const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3_600_000).toISOString();

describe("welcome nudge", () => {
  it("goes once, to sign-ups from 24 to 48 hours ago who haven't set up", () => {
    const setUp = new Set(["done"]);
    expect(needsNudge({ id: "a", created_at: at(30) }, setUp, now)).toBe(true);
    expect(needsNudge({ id: "done", created_at: at(30) }, setUp, now)).toBe(false); // already set up
    expect(needsNudge({ id: "b", created_at: at(10) }, setUp, now)).toBe(false); // too new: tomorrow's run
    expect(needsNudge({ id: "c", created_at: at(60) }, setUp, now)).toBe(false); // yesterday's run had them
    expect(needsNudge({ id: "d", created_at: at(24) }, setUp, now)).toBe(false); // edge belongs to tomorrow
    expect(needsNudge({ id: "e", created_at: at(48) }, setUp, now)).toBe(true); // edge belongs to today
  });

  it("links to setup in both languages", () => {
    for (const lang of ["es", "en"] as const) {
      const { subject, body } = welcomeEmail(lang, "https://micuentaclara.app/app/setup");
      expect(subject.length).toBeGreaterThan(10);
      expect(body.button?.url).toBe("https://micuentaclara.app/app/setup");
      expect(body.lang).toBe(lang);
    }
  });
});
