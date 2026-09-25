import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

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

  const lang = request.nextUrl.searchParams.get("lang");
  if (!isLocale(lang)) return NextResponse.next();

  const headers = new Headers(request.headers);
  headers.set("x-cc-locale", lang);
  const response = NextResponse.next({ request: { headers } });
  if (request.cookies.get(LOCALE_COOKIE)?.value !== lang) {
    response.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 31536000, sameSite: "lax" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
