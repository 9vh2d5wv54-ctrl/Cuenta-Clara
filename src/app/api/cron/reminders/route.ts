import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { daysInMonth } from "@/lib/dates";
import { formatUSD } from "@/lib/money";

// Runs daily (vercel.json). Emails anyone with a bill due in 3 days, in their language.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!url || !serviceKey || !resendKey) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const target = new Date();
  target.setDate(target.getDate() + 3);
  const day = target.getDate();
  const lastDay = daysInMonth(target.getFullYear(), target.getMonth());
  // A bill due on the 31st comes due on the last day of a shorter month.
  const dueDays = day === lastDay ? Array.from({ length: 32 - day }, (_, i) => day + i) : [day];

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: bills, error } = await db
    .from("bills")
    .select("name, amount_cents, users!inner(email, language, reminders_on)")
    .in("due_day", dueDays)
    .eq("reminder_on", true)
    .eq("users.reminders_on", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const from = process.env.REMINDER_FROM_EMAIL ?? "Cuenta Clara <onboarding@resend.dev>";
  let sent = 0;
  for (const bill of bills ?? []) {
    const user = bill.users as unknown as { email: string; language: "es" | "en" };
    const amount = formatUSD(bill.amount_cents);
    const es = user.language !== "en";
    const subject = es ? `Tu ${bill.name} vence en 3 días` : `Your ${bill.name} is due in 3 days`;
    const text = es
      ? `${bill.name}: ${amount}, vence en 3 días.\n\nCuenta Clara`
      : `${bill.name}: ${amount}, due in 3 days.\n\nCuenta Clara`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: user.email, subject, text }),
    });
    if (res.ok) sent++;
  }
  return NextResponse.json({ sent });
}
