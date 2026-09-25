import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, supabaseSecretKey } from "./supabase-env";

/** Vercel sends `Authorization: Bearer $CRON_SECRET` to cron routes. */
export function cronUnauthorized(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!SUPABASE_URL || !supabaseSecretKey()) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }
  return null;
}

export function monthKeyUTC(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export function longDate(d: Date, lang: "es" | "en", timeZone = "America/New_York"): string {
  return d.toLocaleDateString(lang === "es" ? "es-US" : "en-US", { weekday: "long", day: "numeric", month: "long", timeZone });
}
