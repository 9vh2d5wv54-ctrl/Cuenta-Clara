import { SITE_URL } from "./brand";

// The app moved from micuentaclara.app to pocketrecon.app. Visitors on the old
// address are sent to the same page on the new one. Not forwarded: /api (Whop's
// payment webhook still posts to the old address) and /auth (a sign-in started
// on the old address has to finish there).
export const OLD_HOSTS = ["micuentaclara.app", "www.micuentaclara.app"];

/** Where to send a request on the old address, or null to serve it as is. */
export function oldDomainRedirect(url: URL, siteUrl = SITE_URL): URL | null {
  const host = url.hostname.toLowerCase();
  if (!OLD_HOSTS.includes(host)) return null;
  const target = new URL(siteUrl);
  if (OLD_HOSTS.includes(target.hostname)) return null; // not moved yet
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return null;
  const to = new URL(url.pathname + url.search, target);
  return to;
}
