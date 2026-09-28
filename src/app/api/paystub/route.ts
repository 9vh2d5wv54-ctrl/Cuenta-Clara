import { NextResponse, type NextRequest } from "next/server";
import { readPayStub } from "@/lib/ai";
import { isDemo } from "@/lib/demo";
import { cleanReading } from "@/lib/paystub";
import { takeUse } from "@/lib/ai-usage";
import { supabaseAdmin, supabaseFromCookies } from "@/lib/supabase-server";

// Paycheck checker (Plus): a pay stub photo in, the numbers on it out.
// Nothing is saved and the photo is never stored.

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_CHARS = 4_000_000;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { media_type?: unknown; data?: unknown } | null;
  const mediaType = MEDIA_TYPES.find((m) => m === body?.media_type);
  if (!mediaType || typeof body?.data !== "string" || body.data.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: "bad image" }, { status: 400 });
  }

  if (!isDemo) {
    const supabase = await supabaseFromCookies();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
    const { data: plus } = await supabase.rpc("has_plus", { uid: auth.user.id });
    if (!plus) return NextResponse.json({ error: "plus required" }, { status: 402 });
    if (!(await takeUse(supabaseAdmin(), auth.user.id, "[paystub]", new Date().toISOString().slice(0, 10)))) {
      return NextResponse.json({ error: "limit" }, { status: 429 });
    }
  }

  const raw = await readPayStub(mediaType, body.data);
  if (raw === null) return NextResponse.json({ error: "photos unavailable" }, { status: 503 });
  return NextResponse.json({ reading: cleanReading(raw) });
}
