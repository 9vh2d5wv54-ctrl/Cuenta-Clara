import { NextResponse, type NextRequest } from "next/server";
import { takeUse } from "@/lib/ai-usage";
import { isDemo } from "@/lib/demo";
import { sendEmail } from "@/lib/email";
import { cleanFeedback, feedbackRecipient } from "@/lib/feedback";
import { supabaseAdmin, supabaseFromCookies } from "@/lib/supabase-server";

const LABELS = { confusing: "Something's confusing", bug: "Something's broken", idea: "Idea", love: "Something I love", checkin: "3-day check-in" } as const;

// In-app feedback (signed in): emailed to the team with the person's email as reply-to.
export async function POST(request: NextRequest) {
  const input = cleanFeedback(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "bad feedback" }, { status: 400 });

  // Demo mode has no account and no email to send from.
  if (isDemo) return NextResponse.json({ ok: true, demo: true });

  const supabase = await supabaseFromCookies();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (!(await takeUse(supabaseAdmin(), auth.user.id, "[feedback]", new Date().toISOString().slice(0, 10)))) {
    return NextResponse.json({ error: "limit" }, { status: 429 });
  }

  const to = feedbackRecipient();
  if (!to) return NextResponse.json({ error: "not set up" }, { status: 503 });
  const from = auth.user.email ?? "unknown";
  const sent = await sendEmail({
    to,
    userId: auth.user.id,
    kind: null,
    replyTo: auth.user.email ?? undefined,
    subject: `Feedback: ${LABELS[input.kind]} (${input.page})`,
    body: {
      lang: "en",
      paragraphs: [
        `${LABELS[input.kind]} · from ${from} · on ${input.page} · app in ${input.lang === "es" ? "Spanish" : "English"}`,
        input.message,
        "Reply to this email to answer them.",
      ],
    },
  });
  return sent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "send failed" }, { status: 502 });
}
