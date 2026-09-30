import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/LanguageToggle";
import { WordList } from "@/components/WordList";
import { sortedWords } from "@/lib/glossary";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("words");
  return { title: t("title"), description: t("lead") };
}

// Money words dictionary: public, no account needed. Every definition is in the
// server-rendered page so search engines can read it; the search box only filters.
export default async function Palabras() {
  const t = await getTranslations("words");
  const locale = (await getLocale()) === "en" ? "en" : "es";
  const words = sortedWords(locale);
  const other = locale === "en" ? "es" : "en";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: t("title"),
    hasDefinedTerm: words.map((w) => ({ "@type": "DefinedTerm", name: w[locale].term, description: w[locale].def })),
  };

  return (
    <main className="page page--bare">
      <header className="topbar">
        <Link href="/" className="wordmark">
          Pocket Recon
        </Link>
        <LanguageToggle />
      </header>
      <div className="stack-sm">
        <h1 className="t-title">{t("title")}</h1>
        <p className="t-body muted">{t("lead")}</p>
      </div>
      <WordList
        words={words.map((w) => ({ id: w.id, href: w.href, ...w[locale], otherTerm: w[other].term }))}
        labels={{ search: t("search"), none: t("none"), more: t("more"), count: t.raw("count") as string }}
      />
      <Link href="/aprende" className="t-label">
        {t("lessonsLink")} →
      </Link>
      <p className="t-caption muted">{t("notAdvice")}</p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </main>
  );
}
