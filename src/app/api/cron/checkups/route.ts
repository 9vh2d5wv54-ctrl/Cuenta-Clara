import { NextResponse, type NextRequest } from "next/server";
import { writeCheckup } from "@/lib/ai";
import { cronUnauthorized, monthKeyUTC } from "@/lib/cron";
import { appUrl, sendEmail } from "@/lib/email";
import { loadUserMonth, monthInput } from "@/lib/server-budget";
import { supabaseAdmin } from "@/lib/supabase-server";

// "Chequeo listo / Checkup ready": on the 1st, write each person's free checkup
// for the new month and email a one-line teaser to those who get summaries.

type Row = { id: string; email: string; language: "es" | "en"; email_weekly_on: boolean };

export async function GET(request: NextRequest) {
  const denied = cronUnauthorized(request);
  if (denied) return denied;
  const db = supabaseAdmin();
  const month = monthKeyUTC();

  const { data: users, error } = await db.from("users").select("id, email, language, email_weekly_on");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let written = 0;
  let sent = 0;
  for (const user of (users ?? []) as Row[]) {
    const { data: existing } = await db.from("checkups").select("id").eq("user_id", user.id).eq("month", month).maybeSingle();
    if (existing) continue;
    const u = await loadUserMonth(db, user.id, month);
    if (!u.income) continue; // never finished setup

    const summary_text = await writeCheckup(monthInput(u, user.language, month));
    const { error: saveError } = await db
      .from("checkups")
      .insert({ user_id: user.id, month, language: user.language, summary_text });
    if (saveError) continue;
    written++;

    if (!user.email_weekly_on) continue;
    const es = user.language !== "en";
    const ok = await sendEmail({
      to: user.email,
      userId: user.id,
      kind: "weekly",
      subject: es ? "Tu chequeo de dinero está listo" : "Your money checkup is ready",
      body: {
        lang: user.language,
        paragraphs: [summary_text.split("\n").find((l) => l.trim()) ?? ""],
        button: { label: es ? "Ver mi chequeo" : "See my checkup", url: appUrl("/app/chequeo") },
      },
    });
    if (ok) sent++;
  }
  return NextResponse.json({ written, sent });
}
