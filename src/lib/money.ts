import { symbolFor } from "./currencies";

// Brand rule: money reads $1,250.00 in both languages. Home-country amounts
// carry their own symbol and no cents: RD$ 72,400.

const usd = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatUSD(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  return `${sign}$${usd.format(Math.abs(cents) / 100)}`;
}

export function formatHome(amount: number, currency: string): string {
  return `${symbolFor(currency)} ${whole.format(Math.round(amount))}`;
}

/** Parse what someone typed ("1,250.5", "$40") into cents. Returns null if it isn't a positive amount. */
export function parseCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [dollars, fraction = ""] = cleaned.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  return cents > 0 ? cents : null;
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
