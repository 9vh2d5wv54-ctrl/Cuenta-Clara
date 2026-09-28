// Money Style quiz (free, public): 8 questions, each answer points to one of
// four styles. The style with the most answers wins; ties go to the style whose
// tips help most first. For fun and self-reflection, not a psychological test.

export type MoneyStyle = "saver" | "spender" | "giver" | "avoider";

/** Answer order in every question matches this list. */
export const STYLES: MoneyStyle[] = ["saver", "spender", "giver", "avoider"];
export const QUESTION_COUNT = 8;
const TIE_ORDER: MoneyStyle[] = ["avoider", "spender", "giver", "saver"];

/** Lesson slugs for each style's 3 tips, in order. */
export const TIP_LESSONS: Record<MoneyStyle, string[]> = {
  saver: ["fondo-de-emergencia", "interes-compuesto", "presupuesto"],
  spender: ["presupuesto", "apr", "fondo-de-emergencia"],
  giver: ["presupuesto", "fondo-de-emergencia", "enviar-dinero"],
  avoider: ["presupuesto", "credito", "fondo-de-emergencia"],
};

export type StyleResult = { style: MoneyStyle; scores: Record<MoneyStyle, number>; also: MoneyStyle | null };

/** answers: the chosen style for each question. */
export function scoreStyle(answers: MoneyStyle[]): StyleResult {
  const scores = { saver: 0, spender: 0, giver: 0, avoider: 0 };
  for (const a of answers) scores[a]++;
  const ranked = [...TIE_ORDER].sort((a, b) => scores[b] - scores[a]);
  const [style, second] = ranked;
  // A strong second style (3+ of 8 answers) is worth mentioning.
  return { style, scores, also: scores[second] >= 3 ? second : null };
}

const KEY = "cc-money-style";

export function saveStyle(style: MoneyStyle) {
  try {
    localStorage.setItem(KEY, style);
  } catch {
    // storage blocked: nothing to remember with
  }
}
