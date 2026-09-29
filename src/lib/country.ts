// Where the visitor is, set by middleware: a cookie for the browser (setup reads it
// to pick the new account's currency) and a header for the landing page.
export const COUNTRY_COOKIE = "cc-country";
export const COUNTRY_HEADER = "x-cc-country";

/** Browser only: the country the website saw, if any. */
export function browserCountry(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )cc-country=([A-Z]{2})/);
  return match ? match[1] : null;
}
