"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { getStore } from "@/lib/store";
import { Icon } from "./Icon";

export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/** ES/EN switch, available on every screen. Also saves the choice to the profile when signed in. */
export function LanguageToggle() {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const next: Locale = locale === "es" ? "en" : "es";

  async function toggle() {
    setLocaleCookie(next);
    const store = await getStore();
    if (await store.currentUserId()) {
      store.updateProfile({ language: next }).catch(() => {});
    }
    if (search.has("lang")) {
      const params = new URLSearchParams(search);
      params.set("lang", next);
      // Changing only the query string doesn't re-render the root layout, where the
      // client-side messages live, so refresh after replacing the URL.
      startTransition(() => {
        router.replace(`${pathname}?${params}`);
        router.refresh();
      });
    } else {
      startTransition(() => router.refresh());
    }
  }

  return (
    <button
      type="button"
      className="btn btn--ghost"
      onClick={toggle}
      disabled={pending}
      lang={next}
    >
      <Icon name="globe" size={20} />
      {t("switchTo")}
      <span className="sr-only" lang={locale}>
        {t("switchToLabel")}
      </span>
    </button>
  );
}
