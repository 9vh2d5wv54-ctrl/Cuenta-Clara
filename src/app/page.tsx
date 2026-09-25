import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { LanguageToggle } from "@/components/LanguageToggle";
import { formatUSD } from "@/lib/money";

export default async function Landing() {
  const t = await getTranslations("landing");
  const d = await getTranslations("dashboard");

  return (
    <main className="page page--bare">
      <header className="topbar">
        <span className="wordmark">Cuenta Clara</span>
        <LanguageToggle />
      </header>

      <section className="landing-hero">
        <h1 className="t-title">{t("pitch")}</h1>
        <p className="t-body muted">{t("sub")}</p>
        <div className="stack-sm">
          <Link href="/login?mode=signup" className="btn btn--primary btn--block">
            {t("signup")}
          </Link>
          <Link href="/login" className="btn btn--secondary btn--block">
            {t("login")}
          </Link>
        </div>
        <p className="t-caption muted" style={{ textAlign: "center" }}>
          {t("notABank")}
        </p>
      </section>

      {/* A still of the dashboard, so people see the one number before signing up. */}
      <div className="card preview-card" aria-hidden>
        <p className="t-label muted">{d("leftLabel")}</p>
        <p className="t-money-xl" style={{ color: "var(--clara)" }}>
          {formatUSD(41250)}
        </p>
        <div className="breakdown">
          {[
            { label: d("bills"), pct: 0.42, tone: "clara" },
            { label: d("family"), pct: 0.18, tone: "mango" },
            { label: d("savings"), pct: 0.08, tone: "clara" },
          ].map((b) => (
            <div className="breakdown__row" key={b.label}>
              <span className="t-caption muted">{b.label}</span>
              <div className={b.tone === "mango" ? "progress progress--mango" : "progress"}>
                <div className="progress__fill" style={{ width: `${b.pct * 100}%` }} />
              </div>
              <span />
            </div>
          ))}
        </div>
      </div>

      <section className="stack">
        <div className="feature">
          <span className="feature__icon">
            <Icon name="eye" />
          </span>
          <div>
            <h2 className="t-heading">{t("point1Title")}</h2>
            <p className="t-body muted">{t("point1")}</p>
          </div>
        </div>
        <div className="feature">
          <span className="feature__icon feature__icon--mango">
            <Icon name="heart" />
          </span>
          <div>
            <h2 className="t-heading">{t("point2Title")}</h2>
            <p className="t-body muted">{t("point2")}</p>
          </div>
        </div>
        <div className="feature">
          <span className="feature__icon">
            <Icon name="info" />
          </span>
          <div>
            <h2 className="t-heading">{t("point3Title")}</h2>
            <p className="t-body muted">{t("point3")}</p>
          </div>
        </div>
      </section>

      <p className="saying">{t("saying")}</p>
    </main>
  );
}
