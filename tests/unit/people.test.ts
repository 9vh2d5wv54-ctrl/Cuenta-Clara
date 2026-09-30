import { describe, expect, it } from "vitest";
import { maskEmail, peopleRows } from "@/lib/people";
import { checkinDue } from "@/lib/checkin";

const NOW = new Date("2026-09-30T15:00:00Z");
const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe("People list", () => {
  it("masks emails", () => {
    expect(maskEmail("mannyabreu92@gmail.com")).toBe("ma•••@gmail.com");
    expect(maskEmail("bad")).toBe("•••");
  });
  it("shows how far each person got and when they were last active", () => {
    const rows = peopleRows(
      {
        users: [
          { id: "a", email: "ana@x.com", created_at: ago(10), business_on: true },
          { id: "b", email: "bo@x.com", created_at: ago(20) },
          { id: "c", email: "cy@x.com", created_at: ago(1) },
          { id: "d", email: "di@x.com", created_at: ago(40) },
        ],
        setUp: new Set(["a", "b"]),
        entries: [
          { user_id: "a", date: ago(1).slice(0, 10) },
          { user_id: "a", date: ago(2).slice(0, 10) },
          { user_id: "b", date: ago(9).slice(0, 10) },
        ],
        questions: [{ user_id: "a", created_at: ago(0) }],
        notesSeen: [{ user_id: "d", seen_at: ago(30) }],
        phones: new Set(["a"]),
        plus: new Set(),
      },
      NOW,
    );
    expect(rows.map((r) => r.id)).toEqual(["c", "a", "b", "d"]);
    const a = rows[1];
    expect(a).toMatchObject({ email: "an•••@x.com", setUp: true, entries: 2, questions: 1, lastActiveDaysAgo: 0, business: true, phone: true, status: "active" });
    expect(rows[2]).toMatchObject({ lastActiveDaysAgo: 9, status: "quiet" });
    expect(rows[0].status).toBe("new");
    expect(rows[3]).toMatchObject({ lastActiveDaysAgo: 30, status: "gone" });
  });
});

describe("3-day check-in", () => {
  it("shows from day 3 to day 45, once", () => {
    expect(checkinDue(ago(2), false, NOW)).toBe(false);
    expect(checkinDue(ago(3), false, NOW)).toBe(true);
    expect(checkinDue(ago(3), true, NOW)).toBe(false);
    expect(checkinDue(ago(50), false, NOW)).toBe(false);
    expect(checkinDue(null, false, NOW)).toBe(false);
  });
  it("counts people who never used it from the day they joined", () => {
    const input = { users: [5, 20].map((d, i) => ({ id: `n${i}`, email: `n${i}@x.com`, created_at: ago(d) })), setUp: new Set<string>(), entries: [], questions: [], notesSeen: [], phones: new Set<string>(), plus: new Set<string>() };
    expect(peopleRows(input, NOW).map((r) => r.status)).toEqual(["quiet", "gone"]);
  });
});
