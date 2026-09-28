import { describe, expect, it } from "vitest";
import { cleanEntries, parseTextSimple } from "@/lib/quick-log";

const opts = { recipients: [{ id: "m", name: "Mamá" }], bills: [{ id: "r", name: "Renta" }], goals: [{ id: "g", name: "Emergencia" }] };
const today = "2026-09-28";

describe("typed and voice logging (without Claude)", () => {
  it("reads an expense and its amount", () => {
    const [e] = parseTextSimple("Gasté 25 en gasolina", opts, today);
    expect(e.type).toBe("expense");
    expect(e.amount_cents).toBe(2500);
    expect(e.date).toBe(today);
  });
  it("matches a family send to the person", () => {
    const [e] = parseTextSimple("Le mandé 200 a mi mamá", opts, today);
    expect(e.type).toBe("send");
    expect(e.match_id).toBe("m");
  });
  it("finds nothing when there's no amount", () => {
    expect(parseTextSimple("hola", opts, today)).toEqual([]);
  });
});

describe("cleaning what Claude read", () => {
  it("keeps valid entries and drops made-up ids and bad amounts", () => {
    const out = cleanEntries(
      [
        { type: "expense", amount: 12.5, category: "food", match_id: null, date: today, note: "tacos" },
        { type: "send", amount: 100, category: "family", match_id: "someone-else", date: today, note: null },
        { type: "expense", amount: -5, category: "food", match_id: null, date: today, note: null },
        { type: "expense", amount: 9, category: "yachts", match_id: null, date: "2099-01-01", note: null },
      ],
      opts,
      today,
    );
    expect(out[0]).toMatchObject({ type: "expense", amount_cents: 1250, category: "food" });
    expect(out.find((e) => e.type === "send")?.match_id ?? null).toBeNull();
    expect(out.some((e) => e.amount_cents <= 0)).toBe(false);
    expect(out.at(-1)).toMatchObject({ category: "other", date: today }); // unknown category, future date

  });
});
