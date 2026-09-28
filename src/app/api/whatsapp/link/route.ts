import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseFromCookies } from "@/lib/supabase-server";
import { whatsappConfigured, whatsappNumber } from "@/lib/whatsapp";

// Settings → WhatsApp (Plus). POST makes a code that's good for 15 minutes; the
// person sends "CLARA <code>" to our number and the webhook links their phone.
// DELETE disconnects.

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

async function signedIn() {
  const supabase = await supabaseFromCookies();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, supabase };
}

export async function POST() {
  if (!whatsappConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const who = await signedIn();
  if (!who) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { data: plus } = await who.supabase.rpc("has_plus", { uid: who.id });
  if (!plus) return NextResponse.json({ error: "plus required" }, { status: 402 });

  // 6 letters and numbers without look-alikes (0/O, 1/I/L): hard to guess in 15 minutes.
  const code = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
  const expires = new Date(Date.now() + 15 * 60_000).toISOString();
  const { error } = await supabaseAdmin()
    .from("users")
    .update({ whatsapp_code: code, whatsapp_code_expires: expires })
    .eq("id", who.id);
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  return NextResponse.json({ code, number: whatsappNumber() });
}

export async function DELETE() {
  const who = await signedIn();
  if (!who) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  await supabaseAdmin()
    .from("users")
    .update({ whatsapp_phone: null, whatsapp_code: null, whatsapp_code_expires: null, whatsapp_last_entries: null })
    .eq("id", who.id);
  return NextResponse.json({ ok: true });
}
