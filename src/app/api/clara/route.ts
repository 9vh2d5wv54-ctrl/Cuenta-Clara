import { NextResponse, type NextRequest } from "next/server";
import { askClara, MAX_HISTORY_TURNS, MAX_QUESTION, soundsLikeCrisis, type ClaraTurn } from "@/lib/clara";
import { loadClaraData, userNow } from "@/lib/clara-server";
import type { ClaraData } from "@/lib/clara-tools";
import { todayISO } from "@/lib/dates";
import { isDemo } from "@/lib/demo";
import { claraAllowance, hasPlus } from "@/lib/plan";
import { supabaseAdmin, supabaseFromCookies } from "@/lib/supabase-server";

// Clara, the AI money copilot. Free: 3 questions a month; Plus: 30 a day.
// Saved conversations are rows in ai_questions grouped by conversation_id
// (migration 007); "delete" blanks the text but keeps the row, so it still counts.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseHistory(raw: unknown): ClaraTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is ClaraTurn => typeof t?.question === "string" && typeof t?.answer === "string")
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ question: t.question.slice(0, MAX_QUESTION), answer: t.answer.slice(0, 2000) }));
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    question?: unknown;
    conversationId?: unknown;
    history?: unknown;
    lang?: unknown;
    snapshot?: unknown;
  } | null;
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, MAX_QUESTION) : "";
  const conversationId = typeof body?.conversationId === "string" && UUID.test(body.conversationId) ? body.conversationId : null;
  const lang = body?.lang === "en" ? "en" : "es";
  if (!question || !conversationId) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const history = parseHistory(body?.history);

  // Demo mode has no accounts: the browser sends its own numbers and counts its own questions.
  if (isDemo) {
    const data = body?.snapshot as ClaraData | undefined;
    if (!data || typeof data !== "object") return NextResponse.json({ error: "bad input" }, { status: 400 });
    const reply = await askClara({ question, history, data, lang });
    return NextResponse.json({ ...reply, conversationId });
  }

  const supabase = await supabaseFromCookies();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { data: tz } = await supabase.from("users").select("timezone").maybeSingle();
  const now = userNow((tz as { timezone?: string } | null)?.timezone);
  const { data } = await loadClaraData(supabase, now);
  // Testers (CLARA_TESTER_EMAILS in Vercel, comma-separated) get Plus-level Clara without paying.
  const testers = (process.env.CLARA_TESTER_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const tester = Boolean(auth.user.email && testers.includes(auth.user.email.toLowerCase()));
  const plus = hasPlus(data.subscription) || tester;
  const allowance = claraAllowance(plus, todayISO(now));

  const { count } = await supabase
    .from("ai_questions")
    .select("id", { count: "exact", head: true })
    .gte("date", allowance.since);
  const used = count ?? 0;
  // Someone in crisis always gets the crisis lines, even past the limit.
  if (used >= allowance.limit && !soundsLikeCrisis(question)) {
    return NextResponse.json({ error: "limit", plus, limit: allowance.limit, per: allowance.per }, { status: 429 });
  }

  const reply = await askClara({ question, history, data, lang, now });
  let saved = false;
  if (reply.ai) {
    const row = { user_id: auth.user.id, date: todayISO(now), question, answer: reply.answer };
    const admin = supabaseAdmin();
    const withConv = await admin.from("ai_questions").insert({ ...row, conversation_id: conversationId });
    // Before migration 007 there's no conversation_id column: still count the question.
    if (withConv.error) await admin.from("ai_questions").insert(row);
    else saved = true;
  }
  const remaining = Math.max(0, allowance.limit - used - (reply.ai ? 1 : 0));
  return NextResponse.json({ ...reply, conversationId, saved, plus, unlocked: plus, remaining, limit: allowance.limit, per: allowance.per });
}

/** No ?c: the latest conversations. ?c=<id>: that conversation's questions and answers. */
export async function GET(request: NextRequest) {
  if (isDemo) return NextResponse.json({ error: "demo" }, { status: 400 });
  const supabase = await supabaseFromCookies();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const c = request.nextUrl.searchParams.get("c");
  if (c) {
    if (!UUID.test(c)) return NextResponse.json({ error: "bad input" }, { status: 400 });
    const { data, error } = await supabase
      .from("ai_questions")
      .select("question, answer, created_at")
      .eq("conversation_id", c)
      .neq("question", "")
      .order("created_at");
    if (error) return NextResponse.json({ turns: [] });
    return NextResponse.json({ turns: (data ?? []).map((r) => ({ question: r.question, answer: r.answer })) });
  }

  const { data, error } = await supabase
    .from("ai_questions")
    .select("conversation_id, question, created_at")
    .not("conversation_id", "is", null)
    .neq("question", "")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ conversations: [] });
  const seen = new Map<string, { id: string; title: string; updated: string }>();
  for (const r of (data ?? []) as { conversation_id: string; question: string; created_at: string }[]) {
    const prev = seen.get(r.conversation_id);
    // Rows come newest first, so the last one seen is the conversation's first question.
    seen.set(r.conversation_id, { id: r.conversation_id, title: r.question, updated: prev?.updated ?? r.created_at });
  }
  return NextResponse.json({ conversations: [...seen.values()].slice(0, 20) });
}

export async function DELETE(request: NextRequest) {
  if (isDemo) return NextResponse.json({ error: "demo" }, { status: 400 });
  const c = request.nextUrl.searchParams.get("c");
  if (!c || !UUID.test(c)) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const supabase = await supabaseFromCookies();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { error } = await supabaseAdmin()
    .from("ai_questions")
    .update({ question: "", answer: "", conversation_id: null })
    .eq("user_id", auth.user.id)
    .eq("conversation_id", c);
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
