import { NextResponse } from "next/server";

// ExchangeRate-API open access: no key, updates daily. Cached for a day so we
// call it at most once per day per deployment. Their terms require the visible
// "Rates By Exchange Rate API" credit, shown on the Envíos screen.
const SOURCE = "https://open.er-api.com/v6/latest/USD";

export const revalidate = 86400;

export async function GET() {
  try {
    const res = await fetch(SOURCE, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const body = (await res.json()) as {
      result: string;
      time_last_update_utc: string;
      rates: Record<string, number>;
    };
    if (body.result !== "success") throw new Error("rates unavailable");
    return NextResponse.json({ updated: body.time_last_update_utc, rates: body.rates });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
