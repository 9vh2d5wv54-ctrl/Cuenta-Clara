import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { COUNTRY_COOKIE, COUNTRY_HEADER } from "@/lib/country";
import { oldDomainRedirect } from "@/lib/old-domain";

// Ads link with ?lang=es or ?lang=en. That choice wins for this request and is
// saved in the locale cookie so the rest of the visit (and signup) keeps it.
export function middleware(request: NextRequest) {
  // If Supabase falls back to the Site URL, the login link lands on the home
  // page. Send it on to the route that signs you in.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" && (searchParams.has("token_hash") || searchParams.has("code"))) {
    const url = request.nextUrl.clone();
    url.pathname = searchParams.has("token_hash") ? "/auth/confirm" : "/auth/callback";
    return NextResponse.redirect(url);
  }

  // Old address (micuentaclara.app): send visitors to the same page on pocketrecon.app.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const moved = host ? oldDomainRedirect(new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, `https://${host}`)) : null;
  if (moved) return NextResponse.redirect(moved, 308);

  const lang = request.nextUrl.searchParams.get("lang");
  // The visitor's country (Vercel knows it; ?country=GB|CA|US for ads and testing)
  // picks the website's currency and the one a new account starts in.
  const asked = searchParams.get("country")?.toUpperCase();
  const country = (asked && /^[A-Z]{2}$/.test(asked) ? asked : null) ?? request.cookies.get(COUNTRY_COOKIE)?.value ?? request.headers.get("x-vercel-ip-country");

  const headers = new Headers(request.headers);
  if (isLocale(lang)) headers.set("x-cc-locale", lang);
  if (country) headers.set(COUNTRY_HEADER, country);
  const response = NextResponse.next({ request: { headers } });
  if (isLocale(lang) && request.cookies.get(LOCALE_COOKIE)?.value !== lang) {
    response.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 31536000, sameSite: "lax" });
  }
  if (country && (asked || !request.cookies.get(COUNTRY_COOKIE))) {
    response.cookies.set(COUNTRY_COOKIE, country, { path: "/", maxAge: 31536000, sameSite: "lax" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
