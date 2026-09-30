// The app's name and web address, in one place. To move to a new domain
// (like pocketrecon.app), set NEXT_PUBLIC_SITE_URL and CONTACT_EMAIL in Vercel.
export const BRAND = "Pocket Recon";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://micuentaclara.app").replace(/\/$/, "");
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hola@micuentaclara.app";

/** "Pocket Recon <address>": the sender for emails, keeping the address set in Vercel (REMINDER_FROM_EMAIL). */
export function senderAddress(): string {
  const set = process.env.REMINDER_FROM_EMAIL?.trim();
  const address = set ? (set.match(/<([^>]+)>/)?.[1] ?? set) : CONTACT_EMAIL;
  return `${BRAND} <${address}>`;
}
