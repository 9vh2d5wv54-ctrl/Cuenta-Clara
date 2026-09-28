import { createHmac, timingSafeEqual } from "node:crypto";

// Server-only. WhatsApp Business through Meta's Cloud API.
//
// Env:
//   WHATSAPP_TOKEN            permanent access token (system user)
//   WHATSAPP_PHONE_NUMBER_ID  the sending number's id in Meta
//   WHATSAPP_APP_SECRET       Meta app secret, to check webhook signatures
//   WHATSAPP_VERIFY_TOKEN     any string; the same one goes in Meta's webhook settings
//   NEXT_PUBLIC_WHATSAPP_NUMBER  the number people message, digits only (e.g. 12015550123)
//   WHATSAPP_API_VERSION      optional, Graph API version (default below)

const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v23.0";

export function whatsappConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_APP_SECRET &&
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  );
}

export function whatsappNumber(): string {
  return (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
}

/** Meta signs each webhook body with the app secret (X-Hub-Signature-256: sha256=<hex>). */
export function validSignature(body: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("hex"));
  const given = Buffer.from(header.slice("sha256=".length));
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function graph(path: string) {
  return `https://graph.facebook.com/${API_VERSION}/${path}`;
}

function auth() {
  return { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` };
}

/** A plain text reply. Free-form text is allowed within 24 hours of their last message. */
export async function sendText(to: string, body: string): Promise<boolean> {
  const res = await fetch(graph(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`), {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: body.slice(0, 4000) } }),
  });
  if (!res.ok) console.error("whatsapp send failed", res.status, await res.text().catch(() => ""));
  return res.ok;
}

/** Downloads a photo someone sent, as base64. Null if it's too big or fails. */
export async function downloadMedia(mediaId: string): Promise<{ mediaType: string; data: string } | null> {
  const meta = await fetch(graph(mediaId), { headers: auth() });
  if (!meta.ok) return null;
  const info = (await meta.json()) as { url?: string; mime_type?: string; file_size?: number };
  if (!info.url || (info.file_size ?? 0) > 5_000_000) return null;
  const file = await fetch(info.url, { headers: auth() });
  if (!file.ok) return null;
  const bytes = Buffer.from(await file.arrayBuffer());
  return { mediaType: (info.mime_type ?? "image/jpeg").split(";")[0], data: bytes.toString("base64") };
}

/** The message fields we use from Meta's webhook payload. */
export type IncomingMessage = {
  id: string;
  from: string; // phone number, digits only
  type: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
};

export function incomingMessages(payload: unknown): IncomingMessage[] {
  const out: IncomingMessage[] = [];
  const entries = (payload as { entry?: unknown[] })?.entry ?? [];
  for (const entry of entries as { changes?: { value?: { messages?: IncomingMessage[] } }[] }[]) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        if (typeof m?.id === "string" && typeof m?.from === "string") out.push(m);
      }
    }
  }
  return out;
}
