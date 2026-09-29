import type { SupabaseClient } from "@supabase/supabase-js";

// Daily caps on the Plus features that call Claude outside of Clara, so one
// account can't run the credits dry for everyone. Uses are rows in ai_questions
// with a tag as the question (no answer); Clara's own count leaves them out.

export const USAGE_LIMITS = {
  "[quick-log]": 60, // voice, typed and receipt-photo logging (app and WhatsApp)
  "[paystub]": 10, // pay stub photos
  "[feedback]": 10, // feedback messages (no Claude, but each one sends an email)
} as const;
export type UsageKind = keyof typeof USAGE_LIMITS;
export const USAGE_TAGS = Object.keys(USAGE_LIMITS) as UsageKind[];

/** For PostgREST `.not("question", "in", NOT_USAGE)`: Clara and WhatsApp questions only. */
export const USAGE_TAG_LIST = `(${USAGE_TAGS.map((t) => `"${t}"`).join(",")})`;

/** Counts today's uses and records one if there's room. False when the day's limit is reached. */
export async function takeUse(db: SupabaseClient, userId: string, kind: UsageKind, today: string): Promise<boolean> {
  const { count } = await db
    .from("ai_questions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("date", today)
    .eq("question", kind);
  if ((count ?? 0) >= USAGE_LIMITS[kind]) return false;
  await db.from("ai_questions").insert({ user_id: userId, date: today, question: kind, answer: "" });
  return true;
}
