import { describe, expect, it } from "vitest";
import { nextPayday, safeToSpend } from "@/lib/safe-to-spend";
import { household, NOW } from "./fixtures";

describe("next payday", () => {
  it("rolls a biweekly payday forward", () => {
    expect(nextPayday("2026-09-18", "biweekly", "2026-10-01")).toBe("2026-10-02");
    expect(nextPayday("2026-10-03", "biweekly", "2026-09-28")).toBe("2026-10-03");
  });
  it("keeps the day of the month, using the last day of short months", () => {
    expect(nextPayday("2026-01-31", "monthly", "2026-02-10")).toBe("2026-02-28");
  });
  it("pays semimonthly on the 15th and the last day", () => {
    expect(nextPayday("2026-09-15", "semimonthly", "2026-09-20")).toBe("2026-09-30");
  });
});

describe("Safe to Spend", () => {
  it("takes bills before payday, sends still to go and the cushion off the balance", () => {
    const d = household();
    const s = safeToSpend({
      balance: 150000, balanceOn: "2026-09-27", payday: "2026-10-03", buffer: 10000,
      bills: d.bills, recipients: d.recipients, recent: d.recent, now: NOW,
    });
    expect(s.balance).toBe(146000); // $1,500 typed yesterday − $40 logged today
    expect(s.bills).toBe(129000); // power on the 30th + rent on the 1st
    expect(s.family).toBe(20000);
    expect(s.safe).toBe(146000 - 129000 - 20000 - 10000);
    expect(s.perDay).toBeNull(); // nothing safe to spend, so no per-day amount
  });
  it("doesn't count a bill marked paid this month", () => {
    const d = household();
    const paid = [...d.recent, { id: "b", user_id: "u", type: "bill_paid" as const, amount_cents: 9000, category: "bills", recipient_id: null, date: "2026-09-27", note: "Power" }];
    const s = safeToSpend({ balance: 150000, balanceOn: "2026-09-28", payday: "2026-10-03", buffer: 0, bills: d.bills, recipients: [], recent: paid, now: NOW });
    expect(s.billsDue.map((b) => b.bill.name)).toEqual(["Rent"]);
  });
});
