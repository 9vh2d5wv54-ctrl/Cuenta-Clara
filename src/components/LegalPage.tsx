import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { LanguageToggle } from "./LanguageToggle";
import { LEGAL_UPDATED, type LegalDoc } from "@/lib/legal";

/** Privacy policy and terms: public, plain language, in the visitor's language. */
export async function LegalPage({ doc }: { doc: Record<"es" | "en", LegalDoc> }) {
  const locale = (await getLocale()) === "en" ? "en" : "es";
  const t = await getTranslations("legal");
  const d = doc[locale];
  const [y, m, day] = LEGAL_UPDATED.split("-").map(Number);
  const updated = new Date(y, m - 1, day).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { day: "numeric", month: "long", year: "numeric" });
  return (
    <main className="page page--bare legal">
      <header className="topbar">
        <Link href="/" className="wordmark">
          Cuenta Clara
        </Link>
        <LanguageToggle />
      </header>
      <div className="stack-sm">
        <h1 className="t-title">{d.title}</h1>
        <p className="t-caption muted">{t("updated", { date: updated })}</p>
        <p className="t-body">{d.lead}</p>
      </div>
      {d.sections.map((s) => (
        <section key={s.h} className="stack-sm">
          <h2 className="t-heading">{s.h}</h2>
          {s.p?.slice(0, s.list ? 1 : undefined).map((para) => (
            <p key={para} className="t-body">
              {para}
            </p>
          ))}
          {s.list && (
            <ul className="t-body stack-sm" style={{ margin: 0, paddingInlineStart: 20 }}>
              {s.list.map((li) => (
                <li key={li}>{li}</li>
              ))}
            </ul>
          )}
          {s.list &&
            s.p?.slice(1).map((para) => (
              <p key={para} className="t-body">
                {para}
              </p>
            ))}
        </section>
      ))}
      <p className="t-caption muted">
        <Link href="/privacidad">{t("privacy")}</Link> · <Link href="/terminos">{t("terms")}</Link>
      </p>
    </main>
  );
}
