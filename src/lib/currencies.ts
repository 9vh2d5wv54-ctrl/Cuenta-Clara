// Countries the Envíos screen offers. El Salvador and Ecuador use the US dollar,
// so sends there skip conversion.
export type Country = { code: string; currency: string; symbol: string; es: string; en: string };

export const COUNTRIES: Country[] = [
  { code: "MX", currency: "MXN", symbol: "MX$", es: "México", en: "Mexico" },
  { code: "DO", currency: "DOP", symbol: "RD$", es: "República Dominicana", en: "Dominican Republic" },
  { code: "GT", currency: "GTQ", symbol: "Q", es: "Guatemala", en: "Guatemala" },
  { code: "HN", currency: "HNL", symbol: "L", es: "Honduras", en: "Honduras" },
  { code: "SV", currency: "USD", symbol: "$", es: "El Salvador", en: "El Salvador" },
  { code: "CO", currency: "COP", symbol: "COL$", es: "Colombia", en: "Colombia" },
  { code: "EC", currency: "USD", symbol: "$", es: "Ecuador", en: "Ecuador" },
  { code: "PE", currency: "PEN", symbol: "S/", es: "Perú", en: "Peru" },
  { code: "NI", currency: "NIO", symbol: "C$", es: "Nicaragua", en: "Nicaragua" },
  { code: "VE", currency: "VES", symbol: "Bs.", es: "Venezuela", en: "Venezuela" },
  { code: "PR", currency: "USD", symbol: "$", es: "Puerto Rico", en: "Puerto Rico" },
  { code: "CU", currency: "CUP", symbol: "CUP", es: "Cuba", en: "Cuba" },
];

export function countryByCode(code: string | null | undefined): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function symbolFor(currency: string): string {
  return COUNTRIES.find((c) => c.currency === currency)?.symbol ?? currency;
}
