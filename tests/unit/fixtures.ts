import type { ClaraData } from "@/lib/clara-tools";

// One realistic household used across tests. "Today" is Mon Sep 28, 2026.
export const NOW = new Date(2026, 8, 28, 12);

export function household(overrides: Partial<ClaraData> = {}): ClaraData {
  return {
    profile: { balance_cents: 150000, balance_on: "2026-09-28", buffer_cents: 10000, payday_anchor: "2026-10-03", payday_cycle: "biweekly", pay_frequency: null },
    income: 300000,
    bills: [
      { id: "r", user_id: "u", name: "Rent", amount_cents: 120000, due_day: 1, reminder_on: true },
      { id: "p", user_id: "u", name: "Power", amount_cents: 9000, due_day: 30, reminder_on: true },
    ],
    recipients: [{ id: "m", user_id: "u", name: "Mamá", country: "SV", currency: "USD", default_amount_cents: 20000, frequency: "monthly" }],
    goals: [{ id: "g", user_id: "u", name: "Emergency", target_cents: 300000, target_date: "2027-09-01", saved_cents: 50000 }],
    recent: [{ id: "e", user_id: "u", type: "expense", amount_cents: 4000, category: "food", recipient_id: null, date: "2026-09-28", note: null }],
    debts: [{ id: "c", user_id: "u", name: "Visa", balance_cents: 250000, start_balance_cents: 300000, apr: 24.99, min_payment_cents: 7500 }],
    subscription: null,
    taxPct: 0,
    ...overrides,
  };
}
