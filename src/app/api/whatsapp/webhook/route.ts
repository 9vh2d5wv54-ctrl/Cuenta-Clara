import { after, NextResponse, type NextRequest } from "next/server";
import { incomingMessages, validSignature, whatsappConfigured } from "@/lib/whatsapp";
import { handleWhatsApp } from "@/lib/whatsapp-bot";

// Meta's webhook for the WhatsApp assistant.
// GET: Meta checks the URL once, with the verify token set in its dashboard.
// POST: incoming messages. Answer 200 right away and reply after, so Meta doesn't retry.

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === token) {
    return new NextResponse(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  if (!whatsappConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const body = await request.text();
  if (!validSignature(body, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const messages = incomingMessages(payload);
  after(async () => {
    for (const m of messages) await handleWhatsApp(m);
  });
  return NextResponse.json({ ok: true });
}
