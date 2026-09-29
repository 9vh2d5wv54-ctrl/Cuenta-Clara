import { NextResponse, type NextRequest } from "next/server";
import { isDemo } from "@/lib/demo";
import { supabaseFromCookies } from "@/lib/supabase-server";

// Phone notifications: POST saves this phone's push subscription, DELETE removes it.
// Row-level security keeps each person to their own rows.

type Sub = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

function valid(s: Sub | null): s is { endpoint: string; keys: { p256dh: string; auth: string } } {
  return (
    !!s &&
    typeof s.endpoint === "string" &&
    s.endpoint.startsWith("https://") &&
    s.endpoint.length < 1000 &&
    typeof s.keys?.p256dh === "string" &&
    typeof s.keys?.auth === "string" &&
    s.keys.p256dh.length < 200 &&
    s.keys.auth.length < 100
  );
}

export async function POST(request: NextRequest) {
  if (isDemo) return NextResponse.json({ error: "demo" }, { status: 400 });
  const body = (await request.json().catch(() => null)) as { subscription?: Sub; device?: unknown } | null;
  const sub = body?.subscription ?? null;
  if (!valid(sub)) return NextResponse.json({ error: "bad subscription" }, { status: 400 });
  const supabase = await supabaseFromCookies();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const device = typeof body?.device === "string" ? body.device.slice(0, 80) : null;
  // A phone that was signed up by another account moves to this one.
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await supabase
    .from("push_subscriptions")
    .insert({ user_id: auth.user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, device });
  if (error) return NextResponse.json({ error: "not set up" }, { status: 503 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return NextResponse.json({ error: "bad request" }, { status: 400 });
  const supabase = await supabaseFromCookies();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  await supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint);
  return NextResponse.json({ ok: true });
}
