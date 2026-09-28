import { NextResponse, type NextRequest } from "next/server";
import { readQuickLog, type QuickLogInput } from "@/lib/ai";
import { isDemo } from "@/lib/demo";
import { cleanEntries, MAX_TEXT, parseTextSimple, type QuickOption, type QuickOptions } from "@/lib/quick-log";
import { takeUse } from "@/lib/ai-usage";
import { supabaseAdmin, supabaseFromCookies } from "@/lib/supabase-server";

// Quick log (Plus): a sentence or a receipt photo in, entries to confirm out.
// Nothing is saved here and the photo is never stored.

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_CHARS = 4_000_000; // base64; the app shrinks photos well below this

function options(raw: unknown): QuickOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 50)
    .filter((o): o is QuickOption => typeof o?.id === "string" && typeof o?.name === "string")
    .map((o) => ({ id: o.id.slice(0, 64), name: o.name.slice(0, 60) }));
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "bad input" }, { status: 400 });

  if (!isDemo) {
    const supabase = await supabaseFromCookies();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
    const { data: plus } = await supabase.rpc("has_plus", { uid: auth.user.id });
    if (!plus) return NextResponse.json({ error: "plus required" }, { status: 402 });
    if (!(await takeUse(supabaseAdmin(), auth.user.id, "[quick-log]", new Date().toISOString().slice(0, 10)))) {
      return NextResponse.json({ error: "limit" }, { status: 429 });
    }
  }

  const today = typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
    ? body.today
    : new Date().toISOString().slice(0, 10);
  const lists = body.lists as Record<string, unknown> | undefined;
  const opts: QuickOptions = {
    recipients: options(lists?.recipients),
    bills: options(lists?.bills),
    goals: options(lists?.goals),
  };

  const image = body.image as { media_type?: unknown; data?: unknown } | undefined;
  let input: QuickLogInput;
  if (image) {
    const mediaType = MEDIA_TYPES.find((m) => m === image.media_type);
    if (!mediaType || typeof image.data !== "string" || image.data.length > MAX_IMAGE_CHARS) {
      return NextResponse.json({ error: "bad image" }, { status: 400 });
    }
    input = { kind: "image", mediaType, data: image.data };
  } else {
    const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
    if (!text) return NextResponse.json({ error: "bad input" }, { status: 400 });
    input = { kind: "text", text };
  }

  const fromClaude = await readQuickLog(input, opts, today);
  if (fromClaude) return NextResponse.json({ entries: cleanEntries(fromClaude, opts, today) });
  // Without Claude: photos can't be read; sentences go through the keyword reader.
  if (input.kind === "image") return NextResponse.json({ error: "photos unavailable" }, { status: 503 });
  return NextResponse.json({ entries: parseTextSimple(input.text, opts, today) });
}
