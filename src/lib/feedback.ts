// In-app feedback: what kind, what they wrote, and the page they were on.
// It goes by email to the team (FEEDBACK_TO, or the first tester email).

export const FEEDBACK_KINDS = ["confusing", "bug", "idea", "love"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const MAX_FEEDBACK = 2000;

export type FeedbackInput = { kind: FeedbackKind; message: string; page: string; lang: "es" | "en" };

/** Checks and trims what the app sent; null when it isn't usable. */
export function cleanFeedback(body: unknown): FeedbackInput | null {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b !== "object") return null;
  const kind = FEEDBACK_KINDS.find((k) => k === b.kind);
  const message = typeof b.message === "string" ? b.message.trim() : "";
  const page = typeof b.page === "string" && /^\/[\w\-/]*$/.test(b.page) ? b.page.slice(0, 120) : "/";
  const lang = b.lang === "en" ? "en" : "es";
  if (!kind || !message || message.length > MAX_FEEDBACK) return null;
  return { kind, message, page, lang };
}

/** Where feedback goes: FEEDBACK_TO, else the first CLARA_TESTER_EMAILS address. */
export function feedbackRecipient(): string | null {
  const to = (process.env.FEEDBACK_TO ?? "").trim() || (process.env.CLARA_TESTER_EMAILS ?? "").split(",")[0]?.trim();
  return to || null;
}
