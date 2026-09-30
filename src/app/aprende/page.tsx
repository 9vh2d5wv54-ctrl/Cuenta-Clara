import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Icon } from "@/components/Icon";
import { LESSONS } from "@/lib/lessons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("academy");
  return { title: t("title"), description: t("lead") };
}

// Pocket Recon Academy: public, no account needed.
export default async function Academy() {
  const t = await getTranslations("academy");
  const ms = await getTranslations("moneyStyle");
  const w = await getTranslations("words");
  const locale = (await getLocale()) === "en" ? "en" : "es";

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
      <ul className="stack-sm" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {LESSONS.map((l) => (
          <li key={l.slug}>
            <Link href={`/aprende/${l.slug}`} className="card row" style={{ textDecoration: "none" }}>
              <span className="grow stack-sm">
                <span className="t-label">{l[locale].title}</span>
                <span className="t-caption muted">
                  {l[locale].summary} · {t("minutes", { n: l.minutes })}
                </span>
              </span>
              <Icon name="forward" size={20} />
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/estilo" className="card row" style={{ textDecoration: "none" }}>
        <Icon name="heart" />
        <span className="t-label grow">{ms("homeLink")}</span>
        <Icon name="forward" size={20} />
      </Link>
      <Link href="/palabras" className="card row" style={{ textDecoration: "none" }}>
        <Icon name="info" />
        <span className="t-label grow">{w("homeLink")}</span>
        <Icon name="forward" size={20} />
      </Link>
      <p className="t-caption muted">{t("notAdvice")}</p>
    </main>
  );
}
