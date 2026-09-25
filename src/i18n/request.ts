import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";

// No locale in the URL: the choice lives in a cookie so the toggle works on every screen.
// First visit falls back to the browser's language, then Spanish.
export default getRequestConfig(async () => {
  const fromLink = (await headers()).get("x-cc-locale"); // set by middleware from ?lang=
  const saved = fromLink ?? (await cookies()).get(LOCALE_COOKIE)?.value;
  let locale: Locale = defaultLocale;
  if (isLocale(saved)) {
    locale = saved;
  } else {
    const accept = (await headers()).get("accept-language") ?? "";
    if (accept.toLowerCase().startsWith("en")) locale = "en";
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
