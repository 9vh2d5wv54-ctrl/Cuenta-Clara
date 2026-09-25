import { NextResponse, type NextRequest } from "next/server";
import { writeCheckup } from "@/lib/ai";
import { parseCheckupInput } from "@/lib/checkup-input";
import { isDemo } from "@/lib/demo";
import { supabaseAdmin, supabaseFromCookies } from "@/lib/supabase-server";

// The free money checkup. One per user per month: asking again returns the saved one.
export async function POST(request: NextRequest) {
  const input = parseCheckupInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "bad input" }, { status: 400 });

  if (isDemo) {
    const summary_text = await writeCheckup(input);
    return NextResponse.json({ month: input.month, language: input.language, summary_text, created_at: new Date().toISOString() });
  }

  const supabase = await supabaseFromCookies();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { data: existing } = await supabase.from("checkups").select("*").eq("month", input.month).maybeSingle();
  if (existing) return NextResponse.json(existing);

  const summary_text = await writeCheckup(input);
  const { data, error } = await supabaseAdmin()
    .from("checkups")
    .upsert(
      { user_id: auth.user.id, month: input.month, language: input.language, summary_text },
      { onConflict: "user_id,month", ignoreDuplicates: true },
    )
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: "save failed" }, { status: 500 });
  // A parallel request may have saved first; return whichever is stored.
  if (!data) {
    const { data: saved } = await supabase.from("checkups").select("*").eq("month", input.month).single();
    return NextResponse.json(saved);
  }
  return NextResponse.json(data);
}
