import { EXPENSE_CATEGORIES } from "./budget";
import type { EntryType } from "./types";

// Quick log (Plus): say or type "Gasté 25 en gasolina", or snap a receipt, and it
// becomes an entry to confirm. Claude reads it when ANTHROPIC_API_KEY is set; for
// typed or spoken text, a plain keyword reader below covers the common cases
// without it. Nothing is saved until the person taps Save.

export const QUICK_TYPES = ["expense", "send", "bill_paid", "savings", "income"] as const;

/** A name the person already uses: someone they send to, a bill, or a goal. */
export type QuickOption = { id: string; name: string };
export type QuickOptions = { recipients: QuickOption[]; bills: QuickOption[]; goals: QuickOption[] };

export type ParsedEntry = {
  type: EntryType;
  amount_cents: number;
  category: string;
  /** recipient_id for a send, bill id for a paid bill, goal id for savings; null if none matched. */
  match_id: string | null;
  date: string; // YYYY-MM-DD
  note: string | null;
};

export const MAX_TEXT = 300;
export const MAX_ENTRIES = 5;

function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function findName(text: string, options: QuickOption[]): QuickOption | null {
  const t = fold(text);
  return options.find((o) => o.name.trim() && t.includes(fold(o.name.trim()))) ?? null;
}

const CATEGORY_WORDS: [string, RegExp][] = [
  ["transport", /\b(gas|gasolina|uber|lyft|taxi|bus|metro|tren|train|subway|peaje|toll|parking|estacionamiento|carro|car)\b/],
  ["food", /\b(comida|food|super|supermercado|mercado|groceries|grocery|restaurante|restaurant|almuerzo|lunch|cena|dinner|desayuno|breakfast|cafe|coffee|pizza|tacos)\b/],
  ["health", /\b(farmacia|pharmacy|doctor|medico|medicina|medicine|dentista|dentist|hospital|clinica|clinic)\b/],
  ["phone", /\b(telefono|phone|celular|cell|internet|wifi|recarga)\b/],
  ["kids", /\b(ninos|nino|hijos|hija|hijo|kids|kid|escuela|school|panales|diapers|guarderia|daycare)\b/],
  ["home", /\b(casa|home|limpieza|cleaning|muebles|furniture|lavanderia|laundry)\b/],
  ["fun", /\b(cine|movie|movies|fiesta|party|salir|bar|cerveza|beer|concierto|concert|juego|game)\b/],
];

/** Keyword reader for typed or spoken text: no AI, common phrasings in Spanish and English. */
export function parseTextSimple(text: string, options: QuickOptions, today: string): ParsedEntry[] {
  const t = fold(text);
  const amount = t.match(/\$?\s*(\d{1,6}(?:[.,]\d{1,2})?)/);
  if (!amount) return [];
  const cents = Math.round(Number(amount[1].replace(",", ".")) * 100);
  if (!(cents > 0)) return [];

  const base = { amount_cents: cents, date: today };
  if (/\b(me pagaron|cobre|got paid|paycheck|mi pago|my pay|salario|sueldo)\b/.test(t)) {
    return [{ ...base, type: "income", category: "income", match_id: null, note: null }];
  }
  const recipient = findName(text, options.recipients);
  if (recipient || /\b(mande|envie|sent|send|remesa)\b/.test(t)) {
    return [{ ...base, type: "send", category: "family", match_id: recipient?.id ?? null, note: recipient?.name ?? null }];
  }
  const bill = findName(text, options.bills);
  if (bill) return [{ ...base, type: "bill_paid", category: "bills", match_id: bill.id, note: bill.name }];
  const goal = findName(text, options.goals);
  if (goal || /\b(ahorre|saved|ahorro)\b/.test(t)) {
    return [{ ...base, type: "savings", category: "savings", match_id: goal?.id ?? null, note: goal?.name ?? null }];
  }
  const category = CATEGORY_WORDS.find(([, re]) => re.test(t))?.[0] ?? "other";
  const words = text.replace(amount[0], "").replace(/\s+/g, " ").trim();
  return [{ ...base, type: "expense", category, match_id: null, note: words ? words.slice(0, 80) : null }];
}

/** Checks what came back (from Claude or the client) against the person's own lists and sane limits. */
export function cleanEntries(raw: unknown, options: QuickOptions, today: string): ParsedEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ParsedEntry[] = [];
  for (const r of raw.slice(0, MAX_ENTRIES) as Record<string, unknown>[]) {
    if (!r || typeof r !== "object") continue;
    const type = QUICK_TYPES.find((q) => q === r.type);
    const amount = typeof r.amount === "number" ? r.amount : Number(r.amount);
    const cents = Math.round(amount * 100);
    if (!type || !(cents > 0) || cents > 100_000_000) continue;

    const list = type === "send" ? options.recipients : type === "bill_paid" ? options.bills : type === "savings" ? options.goals : [];
    const match = list.find((o) => o.id === r.match_id) ?? null;
    const category =
      type === "expense"
        ? (EXPENSE_CATEGORIES as readonly string[]).includes(String(r.category)) ? String(r.category) : "other"
        : type === "send" ? "family" : type === "bill_paid" ? "bills" : type === "savings" ? "savings" : "income";
    const date = typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.date <= today && r.date >= "2000-01-01" ? r.date : today;
    const note = typeof r.note === "string" && r.note.trim() ? r.note.trim().slice(0, 80) : (match?.name ?? null);
    out.push({ type, amount_cents: cents, category, match_id: match?.id ?? null, date, note });
  }
  return out;
}
