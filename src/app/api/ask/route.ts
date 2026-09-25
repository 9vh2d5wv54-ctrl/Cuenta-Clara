import { NextResponse, type NextRequest } from "next/server";
import { answerQuestion } from "@/lib/ai";
import { parseCheckupInput } from "@/lib/checkup-input";
import { isDemo } from "@/lib/demo";
import { ASK_DAILY_LIMIT } from "@/lib/plan";
import { supabaseAdmin, supabaseFromCookies } from "@/lib/supabase-server";

// "¿Me alcanza?" — Plus only, 30 questions a day.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { question?: unknown; input?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 500) : "";
  const input = parseCheckupInput(body?.input);
  if (!question || !input) return NextResponse.json({ error: "bad input" }, { status: 400 });

  // Demo mode tracks Plus and the daily count in the browser.
  if (isDemo) return NextResponse.json({ answer: await answerQuestion(question, input) });

  const supabase = await supabaseFromCookies();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { data: plus } = await supabase.rpc("has_plus", { uid: auth.user.id });
  if (!plus) return NextResponse.json({ error: "plus required" }, { status: 402 });

  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from("ai_questions")
    .select("id", { count: "exact", head: true })
    .eq("date", today);
  if ((count ?? 0) >= ASK_DAILY_LIMIT) return NextResponse.json({ error: "limit" }, { status: 429 });

  const answer = await answerQuestion(question, input);
  await supabaseAdmin().from("ai_questions").insert({ user_id: auth.user.id, date: today, question, answer });
  return NextResponse.json({ answer, remaining: ASK_DAILY_LIMIT - (count ?? 0) - 1 });
}
