import { NextResponse, type NextRequest } from "next/server";
import { noteLanguage, type ClaraNote } from "@/lib/clara-note";
import { makeClaraNote, saveClaraNote } from "@/lib/clara-note-server";
import { currencyFor, inCurrency } from "@/lib/currency-scope";
import { supabaseAdmin, supabaseFromCookies } from "@/lib/supabase-server";

// Rewrites this week's note from Clara in the language the person uses now.
// Only when the saved note is in the other language (they switched), so it
// can't be used to call Claude over and over.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { lang?: unknown } | null;
  const lang = body?.lang === "en" ? "en" : body?.lang === "es" ? "es" : null;
  if (!lang) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const supabase = await supabaseFromCookies();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const since = new Date(Date.now() - 8 * 86_400_000).toISOString().slice(0, 10);
  const { data: latest } = await supabase
    .from("clara_notes")
    .select("id, week, body, seen_at")
    .gte("week", since)
    .order("week", { ascending: false })
    .limit(1)
    .maybeSingle();
  const current = (latest as ClaraNote | null) ?? null;
  if (!current || noteLanguage(current.body) === lang) return NextResponse.json({ note: current });

  const { data: profile } = await supabase.from("users").select("timezone").maybeSingle();
  const currency = await currencyFor(supabase, auth.user.id);
  const note = await inCurrency(currency, () => makeClaraNote(supabase, undefined, lang, (profile as { timezone?: string } | null)?.timezone));
  if (!note) return NextResponse.json({ note: current });
  const admin = supabaseAdmin();
  // Replace the old-language note (same row when it's this week's).
  if (current.week !== note.week) await admin.from("clara_notes").delete().eq("id", current.id);
  await saveClaraNote(admin, auth.user.id, note.week, note.body);
  const { data: saved } = await supabase.from("clara_notes").select("id, week, body, seen_at").eq("week", note.week).maybeSingle();
  return NextResponse.json({ note: (saved as ClaraNote | null) ?? { id: current.id, week: note.week, body: note.body, seen_at: null } });
}
