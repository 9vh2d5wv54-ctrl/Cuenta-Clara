import Anthropic from "@anthropic-ai/sdk";
import type { CheckupInput } from "./store";
import { isDemo } from "./demo";
import { formatUSD } from "./money";

// Server-only. The app does all the math; Claude only writes the words.
// Without ANTHROPIC_API_KEY the same shapes come from plain templates, so the
// flow works in development and never breaks for users if the API is down.

const MODEL = "claude-opus-5";

// Verbatim from the MVP PRD → "Free hook: the money checkup".
const CHECKUP_SYSTEM = `You create a free monthly money checkup for Cuenta Clara users. Reply in the user's language (Spanish or English), using "tú" in Spanish.

Input: monthly income, rent, bills, family sends, savings (all numbers the user typed).

Output, under 150 words:
1) Open with one specific observation from THEIR numbers.
2) Show what's left this month as one clear number.
3) Name their money style with a warm, short title.
4) Give one concrete, doable next step based on their numbers.
5) Never judge, shame, or guess at numbers they didn't give. Never recommend specific banks, loans, or investments. This is general information, not financial advice.

Tone: warm, clear, like a relative who's good with money.`;

const ASK_SYSTEM = `You answer "¿Me alcanza?" ("Can I afford it?") questions for Cuenta Clara users. Reply in the user's language (Spanish or English), using "tú" in Spanish.

You get the user's budget for this month (every number already calculated) and one question. Answer in under 80 words:
1) Start with a clear yes, no, or "it's tight", based only on their numbers.
2) Show the one number that decides it (usually what's left after the purchase).
3) If it doesn't fit, suggest one concrete way it could.

Never judge or shame. Never guess at numbers they didn't give. Never recommend specific banks, loans, credit, or investments; this is general information, not financial advice. If the question isn't about their money, say kindly that you only help with their budget.

Tone: warm, clear, like a relative who's good with money.`;

function hasKey() {
  if (!process.env.ANTHROPIC_API_KEY) return false;
  // Demo mode has no sign-in, so the AI endpoints would be open to anyone.
  // Only call Claude there when explicitly allowed (local development).
  const demo = isDemo;
  return !demo || process.env.ALLOW_DEMO_AI === "true";
}

let client: Anthropic | null = null;
function claude() {
  client ??= new Anthropic();
  return client;
}

function budgetLines(i: CheckupInput): string {
  return [
    `Language: ${i.language === "es" ? "Spanish" : "English"}`,
    `Month: ${i.month}`,
    `Monthly income: ${formatUSD(i.income_cents)}`,
    `Rent: ${formatUSD(i.rent_cents)}`,
    `Other bills: ${formatUSD(i.bills_cents - i.rent_cents)}`,
    `Family sends: ${formatUSD(i.family_cents)}`,
    `Savings this month: ${formatUSD(i.savings_cents)}`,
    ...(i.taxes_cents ? [`Set aside for taxes (pay has no taxes taken out): ${formatUSD(i.taxes_cents)}`] : []),
    `Everyday spending logged so far: ${formatUSD(i.spending_cents)}`,
    `What's left this month (already calculated): ${formatUSD(i.left_cents)}`,
  ].join("\n");
}

/** One call, text back. Falls back to another model on a safety decline; returns null on any failure. */
async function write(system: string, user: string, maxTokens: number): Promise<string | null> {
  try {
    const response = await claude().beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (response.stop_reason === "refusal") return null;
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text || null;
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error("claude error", err.status, err.message);
    else console.error("claude error", err);
    return null;
  }
}

const WEEKLY_SYSTEM = `You write the one friendly opening line of a weekly budget email for a Cuenta Clara user. Reply in the user's language (Spanish or English), using "tú" in Spanish. One sentence, under 25 words, no exclamation marks, no emoji. Mention one real number from their budget. Never judge or shame. Tone: warm, clear, like a relative who's good with money.`;

/** The Claude-written line at the top of the weekly email. The numbers below it come from code. */
export async function writeWeeklyLine(i: CheckupInput): Promise<string> {
  if (hasKey()) {
    const text = await write(WEEKLY_SYSTEM, budgetLines(i), 300);
    if (text) return text.split("\n")[0];
  }
  return i.language === "es"
    ? `Esta semana cierras con ${formatUSD(i.left_cents)} disponibles para lo que queda del mes.`
    : `You're heading into the week with ${formatUSD(i.left_cents)} left for the rest of the month.`;
}

const PAYDAY_SYSTEM = `You write the one friendly opening line of a "payday tomorrow" email from Clara, the money copilot in Cuenta Clara. Reply in the user's language (Spanish or English), using "tú" in Spanish. One sentence, under 25 words, no exclamation marks, no emoji. Use only numbers given below, never calculate new ones. If what's left is negative, be calm and practical: bills first. Never judge or shame. Tone: warm, clear, like a relative who's good with money.`;

/** Clara's first line in the payday email. The plan below it comes from code. */
export async function writePaydayLine(facts: string, fallback: string): Promise<string> {
  if (hasKey()) {
    const text = await write(PAYDAY_SYSTEM, facts, 300);
    if (text) return text.split("\n")[0];
  }
  return fallback;
}

export async function writeCheckup(i: CheckupInput): Promise<string> {
  if (hasKey()) {
    const text = await write(CHECKUP_SYSTEM, budgetLines(i), 2000);
    if (text) return text;
  }
  return templateCheckup(i);
}

export async function answerQuestion(question: string, i: CheckupInput): Promise<string> {
  if (hasKey()) {
    const text = await write(ASK_SYSTEM, `${budgetLines(i)}\n\nQuestion: ${question}`, 1000);
    if (text) return text;
  }
  return i.language === "es"
    ? `Te quedan ${formatUSD(i.left_cents)} este mes. Si lo que quieres cuesta menos que eso, te alcanza sin tocar tus cuentas, tus envíos ni tu ahorro.`
    : `You have ${formatUSD(i.left_cents)} left this month. If it costs less than that, it fits without touching your bills, sends, or savings.`;
}

/** Plain-words checkup built from the same numbers, used without an API key. */
function templateCheckup(i: CheckupInput): string {
  const pct = (part: number) => (i.income_cents > 0 ? Math.round((part / i.income_cents) * 100) : 0);
  const es = i.language === "es";
  const familyPct = pct(i.family_cents);
  const billsPct = pct(i.bills_cents);
  const left = formatUSD(i.left_cents);

  const observation =
    i.family_cents > 0
      ? es
        ? `Mandas a casa el ${familyPct}% de lo que ganas, y tus cuentas fijas se llevan el ${billsPct}%.`
        : `You send home ${familyPct}% of what you earn, and fixed bills take ${billsPct}%.`
      : es
        ? `Tus cuentas fijas se llevan el ${billsPct}% de lo que ganas.`
        : `Fixed bills take ${billsPct}% of what you earn.`;

  const leftLine =
    i.left_cents >= 0
      ? es
        ? `Te quedan ${left} este mes.`
        : `You have ${left} left this month.`
      : es
        ? `Este mes vas ${formatUSD(-i.left_cents)} por encima de lo que entra.`
        : `This month you're ${formatUSD(-i.left_cents)} over what comes in.`;

  const title =
    familyPct >= 15
      ? es
        ? "El Pilar de la Familia"
        : "The Family Anchor"
      : i.savings_cents > 0
        ? es
          ? "El Ahorrador Constante"
          : "The Steady Saver"
        : es
          ? "El Organizador"
          : "The Organizer";

  const step =
    i.left_cents < 0
      ? es
        ? "Revisa tus gastos del día a día y elige una categoría para bajar esta semana."
        : "Look at your everyday spending and pick one category to trim this week."
      : i.savings_cents === 0
        ? es
          ? "Crea una meta pequeña, aunque sean $25 al mes, para empezar tu colchón."
          : "Start a small goal, even $25 a month, to begin your cushion."
        : es
          ? "Anota tus gastos esta semana para que el número siga siendo real."
          : "Log your spending this week so the number stays real.";

  return [observation, leftLine, es ? `Tu estilo: ${title}.` : `Your style: ${title}.`, step].join("\n\n");
}

// Quick log (Plus): turn a sentence or a receipt photo into entries to confirm.
const QUICK_LOG_SYSTEM = `You turn what a Cuenta Clara user said, typed, or photographed into budget entries. Users write in Spanish, English, or a mix.

Entry types:
- expense: everyday spending. Pick the closest category: food, transport, home, health, phone, kids, fun, other.
- send: money sent to family. Set match_id to the matching person from the list when one fits.
- bill_paid: a fixed bill they paid. Set match_id to the matching bill from the list when one fits.
- savings: money put toward a goal. Set match_id to the matching goal when one fits.
- income: pay they received ("me pagaron", "got paid").

Rules:
- amount is in US dollars as a number (25.5, not "$25.50"). For a receipt, use the final total paid, including tax and tip.
- date is YYYY-MM-DD. Use today's date unless they say another day ("ayer" = yesterday) or the receipt shows one. Never a future date.
- note is a few words: the store name on a receipt, or what they bought. Empty string if nothing useful.
- match_id is an id from the lists given, or an empty string. Never invent ids.
- category is required for every entry; for non-expense types use "other".
- A money-transfer receipt (Western Union, Remitly, Ria, and similar) is a send; use the amount sent, not including fees.
- If there is no clear amount, or the input isn't about money, return an empty entries list. Never guess an amount.
- At most 5 entries.`;

const QUICK_LOG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["entries"],
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "amount", "category", "match_id", "date", "note"],
        properties: {
          type: { type: "string", enum: ["expense", "send", "bill_paid", "savings", "income"] },
          amount: { type: "number" },
          category: { type: "string", enum: ["food", "transport", "home", "health", "phone", "kids", "fun", "other"] },
          match_id: { type: "string" },
          date: { type: "string" },
          note: { type: "string" },
        },
      },
    },
  },
} as const;

export type QuickLogInput =
  | { kind: "text"; text: string }
  | { kind: "image"; mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };

/** Whether Claude can read quick-log input (receipt photos need it). */
export function quickLogAvailable(): boolean {
  return hasKey();
}

/** Raw entries from Claude, to be checked with cleanEntries; null if Claude isn't available or fails. */
export async function readQuickLog(
  input: QuickLogInput,
  lists: { recipients: { id: string; name: string }[]; bills: { id: string; name: string }[]; goals: { id: string; name: string }[] },
  today: string,
): Promise<unknown[] | null> {
  if (!hasKey()) return null;
  const context = [
    `Today: ${today}`,
    `People they send to: ${JSON.stringify(lists.recipients)}`,
    `Their bills: ${JSON.stringify(lists.bills)}`,
    `Their goals: ${JSON.stringify(lists.goals)}`,
  ].join("\n");
  const content: Anthropic.Beta.BetaContentBlockParam[] =
    input.kind === "text"
      ? [{ type: "text", text: `${context}\n\nWhat they said: ${input.text}` }]
      : [
          { type: "image", source: { type: "base64", media_type: input.mediaType, data: input.data } },
          { type: "text", text: `${context}\n\nThis is a photo of a receipt or transfer slip.` },
        ];
  try {
    const response = await claude().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: QUICK_LOG_SCHEMA } },
      system: QUICK_LOG_SYSTEM,
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") return null;
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = JSON.parse(text) as { entries?: unknown };
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error("claude quick log error", err.status, err.message);
    else console.error("claude quick log error", err);
    return null;
  }
}

// Paycheck checker (Plus): read the numbers off a pay stub photo. The app does the math.
const PAYSTUB_SYSTEM = `You read a photo of a US pay stub and copy numbers exactly as printed. Do not calculate or estimate anything.

Fields (use 0 for a number and "" for text when the stub doesn't show it clearly):
- hourly_rate: the regular hourly rate in dollars.
- regular_hours: regular hours for this pay period.
- overtime_hours: overtime hours for this pay period.
- overtime_rate: the overtime hourly rate in dollars.
- gross_pay: this period's gross pay (total before deductions), not year-to-date.
- net_pay: this period's net pay (take-home), not year-to-date.
- period_start, period_end: the pay period dates as YYYY-MM-DD.
- employer: the employer's name.

Only this pay period's amounts, never year-to-date columns. If the image isn't a pay stub, return all zeros and empty strings.`;

const PAYSTUB_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["hourly_rate", "regular_hours", "overtime_hours", "overtime_rate", "gross_pay", "net_pay", "period_start", "period_end", "employer"],
  properties: {
    hourly_rate: { type: "number" },
    regular_hours: { type: "number" },
    overtime_hours: { type: "number" },
    overtime_rate: { type: "number" },
    gross_pay: { type: "number" },
    net_pay: { type: "number" },
    period_start: { type: "string" },
    period_end: { type: "string" },
    employer: { type: "string" },
  },
} as const;

/** Raw reading of a pay stub photo, to be checked with cleanReading; null if Claude isn't available or fails. */
export async function readPayStub(mediaType: "image/jpeg" | "image/png" | "image/webp", data: string): Promise<unknown | null> {
  if (!hasKey()) return null;
  try {
    const response = await claude().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: PAYSTUB_SCHEMA } },
      system: PAYSTUB_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            { type: "text", text: "Read this pay stub." },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") return null;
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return JSON.parse(text) as unknown;
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error("claude pay stub error", err.status, err.message);
    else console.error("claude pay stub error", err);
    return null;
  }
}
