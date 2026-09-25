import { createHmac, timingSafeEqual } from "node:crypto";

// Server-only. Every email goes through Resend in the person's language, with a
// one-click unsubscribe (link + List-Unsubscribe headers) and the sender's
// mailing address, per CAN-SPAM.

export type EmailKind = "weekly" | "bills" | "rates";
type Lang = "es" | "en";

const COLORS = { surface: "#f8f8f4", raised: "#ffffff", ink: "#1c2826", muted: "#5a6562", clara: "#0f6b5f", line: "#e1e5de" };

export function appUrl(path = ""): string {
  const base = process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}${path}`;
}

function secret(): string {
  const s = process.env.EMAIL_LINK_SECRET ?? process.env.CRON_SECRET;
  if (!s) throw new Error("Set EMAIL_LINK_SECRET to sign unsubscribe links");
  return s;
}

function sign(userId: string, kind: EmailKind): string {
  return createHmac("sha256", secret()).update(`${userId}:${kind}`).digest("base64url");
}

export function verifyUnsubscribe(userId: string, kind: string, sig: string): kind is EmailKind {
  if (kind !== "weekly" && kind !== "bills" && kind !== "rates") return false;
  if (!process.env.EMAIL_LINK_SECRET && !process.env.CRON_SECRET) return false;
  const expected = Buffer.from(sign(userId, kind));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function unsubscribeUrl(userId: string, kind: EmailKind): string {
  const q = new URLSearchParams({ u: userId, k: kind, s: sign(userId, kind) });
  return appUrl(`/api/unsubscribe?${q}`);
}

function escape(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
}

export type EmailBody = {
  lang: Lang;
  paragraphs: string[];
  button?: { label: string; url: string };
  /** One gentle line at the bottom (the weekly Plus mention). */
  footnote?: string;
};

function render(body: EmailBody, unsubscribe: string | null): { html: string; text: string } {
  // Placeholder until the PO box exists (LAUNCH_CHECKLIST). Set MAILING_ADDRESS to the real one.
  const address = process.env.MAILING_ADDRESS ?? "Cuenta Clara · Newark, NJ";
  const unsubLabel = body.lang === "es" ? "Dejar de recibir estos correos" : "Unsubscribe from these emails";
  const paras = body.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${COLORS.ink}">${escape(p)}</p>`)
    .join("");
  const button = body.button
    ? `<a href="${escape(body.button.url)}" style="display:inline-block;background:${COLORS.clara};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 20px;border-radius:12px">${escape(body.button.label)}</a>`
    : "";
  const foot = body.footnote
    ? `<p style="margin:24px 0 0;font-size:14px;line-height:20px;color:${COLORS.muted}">${escape(body.footnote)}</p>`
    : "";
  const html = `<!doctype html><html lang="${body.lang}"><body style="margin:0;background:${COLORS.surface};font-family:Figtree,system-ui,-apple-system,'Segoe UI',sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" style="max-width:480px"><tr><td>
<p style="margin:0 0 16px;font-weight:700;font-size:20px;color:${COLORS.clara}">Cuenta Clara</p>
<div style="background:${COLORS.raised};border-radius:20px;padding:24px">${paras}${button}${foot}</div>
<p style="margin:16px 0 0;font-size:12px;line-height:18px;color:${COLORS.muted}">${unsubscribe ? `<a href="${escape(unsubscribe)}" style="color:${COLORS.muted}">${unsubLabel}</a><br>` : ""}${escape(address)}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    ...body.paragraphs,
    body.button ? `${body.button.label}: ${body.button.url}` : "",
    body.footnote ?? "",
    "--",
    unsubscribe ? `${unsubLabel}: ${unsubscribe}` : "",
    address,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { html, text };
}

/** kind null = transactional (the trial-ending notice): no unsubscribe, it's about their billing. */
export async function sendEmail(opts: { to: string; userId: string; kind: EmailKind | null; subject: string; body: EmailBody }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const unsub = opts.kind ? unsubscribeUrl(opts.userId, opts.kind) : null;
  const { html, text } = render(opts.body, unsub);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.REMINDER_FROM_EMAIL ?? "Cuenta Clara <onboarding@resend.dev>",
      to: opts.to,
      subject: opts.subject,
      html,
      text,
      headers: unsub
        ? { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
        : undefined,
    }),
  });
  if (!res.ok) {
    lastSendError = `${res.status} ${await res.text().catch(() => "")}`.slice(0, 400);
    console.error("resend failed", lastSendError);
  }
  return res.ok;
}

/** Resend's reply to the most recent failed send (for the test page). */
export let lastSendError: string | null = null;

/** For tests and previews. */
export const renderEmail = render;
