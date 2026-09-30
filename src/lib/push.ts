import type { SupabaseClient } from "@supabase/supabase-js";
import { createECDH } from "node:crypto";
import webpush from "web-push";
import { SITE_URL } from "./brand";

// Phone notifications (web push). Works on Android and desktop browsers, and on
// iPhone once Pocket Recon is added to the Home Screen (iOS 16.4+). Only one key
// lives in Vercel: VAPID_PRIVATE_KEY (made on the tester dashboard, /app/admin).
// The public key is worked out from it, so the two can never mismatch; phones get
// it from /api/push/key. VAPID_SUBJECT is optional.

export type PushKind = "note" | "bills" | "payday";
export type PushMessage = { title: string; body: string; url: string; tag?: string };

const PREF: Record<PushKind, "push_note_on" | "push_bills_on" | "push_payday_on"> = {
  note: "push_note_on",
  bills: "push_bills_on",
  payday: "push_payday_on",
};

/** The public key that belongs to a private key, or null if the private key isn't valid. */
export function publicKeyFor(priv: string | undefined): string | null {
  const raw = priv?.trim();
  if (!raw) return null;
  try {
    const bytes = Buffer.from(raw, "base64url");
    if (bytes.length !== 32) return null;
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(bytes);
    return ecdh.getPublicKey().toString("base64url");
  } catch {
    return null;
  }
}

/** The public key phones sign up with (from VAPID_PRIVATE_KEY). */
export function vapidPublicKey(): string | null {
  return publicKeyFor(process.env.VAPID_PRIVATE_KEY);
}

export function pushConfigured(): boolean {
  return vapidPublicKey() !== null;
}

let ready = false;
function setup(): boolean {
  if (ready) return true;
  if (!pushConfigured()) return false;
  const subject = process.env.VAPID_SUBJECT || SITE_URL;
  webpush.setVapidDetails(subject, vapidPublicKey()!, process.env.VAPID_PRIVATE_KEY!.trim());
  ready = true;
  return true;
}

/** True when a private key belongs to a public key. */
export function keysMatch(pub: string | undefined, priv: string | undefined): boolean {
  const derived = publicKeyFor(priv);
  return Boolean(pub && derived && derived === pub.trim());
}

/** Why the last sendPush calls failed (for the tester check page). */
export const lastPushErrors: string[] = [];

/** Keeps a notification short enough to read on a lock screen. */
export function shorten(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return `${cut.slice(0, end > max * 0.6 ? end : max - 1).replace(/[.,;:]$/, "")}…`;
}

/**
 * People with at least one phone signed up and this kind turned on.
 * Empty before migration 012 or without keys, so the crons just skip push.
 */
export async function pushUsers(db: SupabaseClient, kind: PushKind): Promise<Set<string>> {
  if (!pushConfigured()) return new Set();
  const { data, error } = await db.from("push_subscriptions").select(`user_id, users!inner(${PREF[kind]})`);
  if (error || !data) return new Set();
  const out = new Set<string>();
  for (const row of data as unknown as { user_id: string; users: Record<string, boolean> | Record<string, boolean>[] }[]) {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    if (u?.[PREF[kind]] !== false) out.add(row.user_id);
  }
  return out;
}

/** Sends to every phone the person signed up. Returns how many got it. Phones that turned it off are removed. */
export async function sendPush(db: SupabaseClient, userId: string, msg: PushMessage): Promise<number> {
  if (!setup()) return 0;
  const { data } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  const payload = JSON.stringify({ ...msg, body: shorten(msg.body) });
  let delivered = 0;
  for (const s of (data ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[]) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
      delivered++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410: the phone unsubscribed or the app was removed. Forget it.
      if (status === 404 || status === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
      else console.error("push failed", status, (err as Error).message);
      const body = (err as { body?: string }).body;
      lastPushErrors.push(`${status ?? "?"} ${(body || (err as Error).message || "").slice(0, 160)}`.trim());
      if (lastPushErrors.length > 5) lastPushErrors.shift();
    }
  }
  return delivered;
}
