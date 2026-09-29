import { symbolFor } from "./currencies";

// Brand rule: money reads $1,250.00 in both languages. Home-country amounts
// carry their own symbol and no cents: RD$ 72,400.
//
// The person's own currency (US dollar, Canadian dollar or British pound) is set
// once: in the browser from their profile (DataProvider), on the server per
// request with inCurrency() (lib/currency-scope.ts). formatUSD keeps its old name
// but formats in that currency.

export type AppCurrency = "USD" | "CAD" | "GBP";
export const APP_CURRENCIES: AppCurrency[] = ["USD", "CAD", "GBP"];
const SYMBOL: Record<AppCurrency, string> = { USD: "$", CAD: "$", GBP: "£" };

export function isAppCurrency(value: unknown): value is AppCurrency {
  return typeof value === "string" && (APP_CURRENCIES as string[]).includes(value);
}

let browserCurrency: AppCurrency = "USD";

/** Browser only: the signed-in person's currency, from their profile. */
export function setAppCurrency(value: unknown) {
  browserCurrency = isAppCurrency(value) ? value : "USD";
}

/** The currency money is shown in right now (the server's per-request scope wins). */
export function appCurrency(): AppCurrency {
  const scoped = (globalThis as { __ccCurrencyScope?: () => AppCurrency | undefined }).__ccCurrencyScope?.();
  return scoped ?? browserCurrency;
}

export function currencySymbol(currency: AppCurrency = appCurrency()): string {
  return SYMBOL[currency];
}

/** A best guess from the browser's language, for new accounts: en-GB → GBP, en-CA/fr-CA → CAD. */
export function currencyFromLocale(locale: string | undefined): AppCurrency {
  const region = (locale ?? "").split("-")[1]?.toUpperCase();
  if (region === "GB" || region === "UK") return "GBP";
  if (region === "CA") return "CAD";
  return "USD";
}

const usd = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatUSD(cents: number, currency: AppCurrency = appCurrency()): string {
  const sign = cents < 0 ? "−" : "";
  return `${sign}${SYMBOL[currency]}${usd.format(Math.abs(cents) / 100)}`;
}

export function formatHome(amount: number, currency: string): string {
  return `${symbolFor(currency)} ${whole.format(Math.round(amount))}`;
}

/** Parse what someone typed ("1,250.5", "$40") into cents. Returns null if it isn't a positive amount. */
export function parseCents(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/^(US|CA|C)(?=\$)/i, "")
    .replace(/[$£,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [dollars, fraction = ""] = cleaned.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  return cents > 0 ? cents : null;
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Example text written with "$" ("Can I afford $600?") shown in the person's currency symbol. */
export function localizeDollars(text: string): string {
  const symbol = currencySymbol();
  return symbol === "$" ? text : text.replace(/\$(?=\d)/g, symbol);
}

/** Plus is billed in US dollars everywhere, so outside the U.S. the price says so: US$4.99. */
export function usdPrice(label: string): string {
  return appCurrency() === "USD" ? label : label.replace(/^\$/, "US$");
}
