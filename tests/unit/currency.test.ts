import { afterEach, describe, expect, it } from "vitest";
import { rateBetween } from "@/lib/currencies";
import { inCurrency } from "@/lib/currency-scope";
import { appCurrency, currencyFromCountry, currencyFromLocale, formatUSD, localizeDollars, parseCents, setAppCurrency, usdPrice } from "@/lib/money";

afterEach(() => setAppCurrency("USD"));

describe("the person's currency", () => {
  it("formats in the chosen currency", () => {
    expect(formatUSD(125000)).toBe("$1,250.00");
    expect(formatUSD(125000, "GBP")).toBe("£1,250.00");
    expect(formatUSD(-4050, "GBP")).toBe("−£40.50");
    expect(formatUSD(125000, "CAD")).toBe("$1,250.00");
    setAppCurrency("GBP");
    expect(formatUSD(999)).toBe("£9.99");
    setAppCurrency("nonsense");
    expect(appCurrency()).toBe("USD");
  });

  it("reads amounts typed with £ or C$", () => {
    expect(parseCents("£40")).toBe(4000);
    expect(parseCents("£1,250.50")).toBe(125050);
    expect(parseCents("C$20")).toBe(2000);
    expect(parseCents("CA$20.5")).toBe(2050);
    expect(parseCents("$15")).toBe(1500);
    expect(parseCents("£")).toBeNull();
  });

  it("guesses from the phone's region", () => {
    expect(currencyFromLocale("en-GB")).toBe("GBP");
    expect(currencyFromLocale("fr-CA")).toBe("CAD");
    expect(currencyFromLocale("en-CA")).toBe("CAD");
    expect(currencyFromLocale("es-MX")).toBe("USD");
    expect(currencyFromLocale("en")).toBe("USD");
    expect(currencyFromLocale(undefined)).toBe("USD");
  });

  it("converts sends from the person's currency, with rates quoted per US dollar", () => {
    const rates = { MXN: 18, GBP: 0.75, CAD: 1.35 };
    expect(rateBetween(rates, "USD", "MXN")).toBe(18);
    expect(rateBetween(rates, "GBP", "MXN")).toBe(24); // 1 GBP = 18 / 0.75
    expect(rateBetween(rates, "CAD", "USD")).toBeCloseTo(1 / 1.35);
    expect(rateBetween(rates, "GBP", "XYZ")).toBeNull();
  });

  it("keeps two people's currencies apart on the server", async () => {
    const [a, b] = await Promise.all([
      inCurrency("GBP", async () => {
        await new Promise((r) => setTimeout(r, 10));
        return formatUSD(500);
      }),
      inCurrency("CAD", async () => {
        await new Promise((r) => setTimeout(r, 1));
        return `${appCurrency()} ${formatUSD(500)}`;
      }),
    ]);
    expect(a).toBe("£5.00");
    expect(b).toBe("CAD $5.00");
    expect(appCurrency()).toBe("USD"); // nothing leaks outside the scope
  });
});

describe("currencyFromCountry", () => {
  it("maps the visitor's country to a currency", () => {
    expect(currencyFromCountry("GB")).toBe("GBP");
    expect(currencyFromCountry("gb")).toBe("GBP");
    expect(currencyFromCountry("CA")).toBe("CAD");
    expect(currencyFromCountry("US")).toBe("USD");
    expect(currencyFromCountry("DO")).toBe("USD");
    expect(currencyFromCountry(null)).toBe("USD");
  });
  it("prices and dollar amounts for a given currency", () => {
    expect(localizeDollars("Can I afford $150?", "GBP")).toBe("Can I afford £150?");
    expect(usdPrice("$4.99", "CAD")).toBe("US$4.99");
    expect(usdPrice("$4.99", "USD")).toBe("$4.99");
  });
});
