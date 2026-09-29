import type { SupabaseClient } from "@supabase/supabase-js";
import { writeClaraNote } from "./ai";
import { fallbackNote, hasNoteData, noteFacts, noteWeek } from "./clara-note";
import { loadClaraData, userNow } from "./clara-server";

/**
 * Writes this week's note for one person (admin client + userId, or their own
 * session). Null when there's nothing to write about yet. Run inside inCurrency().
 */
export async function makeClaraNote(db: SupabaseClient, userId: string | undefined, lang: "es" | "en", timezone: string | null | undefined) {
  const now = userNow(timezone);
  const { data } = await loadClaraData(db, now, userId);
  if (!hasNoteData(data, now)) return null;
  const written = await writeClaraNote(noteFacts(data, now), lang);
  return { week: noteWeek(now), body: written ?? fallbackNote(data, lang, now), ai: written !== null };
}

/** Saves (or replaces) this week's note. Before migration 011 there's no table; that's fine. */
export async function saveClaraNote(db: SupabaseClient, userId: string, week: string, body: string): Promise<boolean> {
  const { error } = await db.from("clara_notes").upsert({ user_id: userId, week, body, seen_at: null }, { onConflict: "user_id,week" });
  return !error;
}
