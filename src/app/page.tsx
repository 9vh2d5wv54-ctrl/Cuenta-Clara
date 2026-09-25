import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/Icon";
import { LanguageToggle } from "@/components/LanguageToggle";
import { CtaLink } from "@/components/landing/CtaLink";
import { StickyCta } from "@/components/landing/StickyCta";
import { formatUSD } from "@/lib/money";

// The ad landing page (Cuenta Clara Landing Page PRD). Order follows the teardown:
// result and trust first, then the pitch, then doubts, then the ask again.
// No invented stats or testimonials: the trust strip holds true facts until real
// results exist.

const SAMPLE_LEFT = 41250;

export default async function Landing() {
  const t = await getTranslations("landing");
  const d = await getTranslations("dashboard");
  const nav = await getTranslations("nav");

  const trust: { icon: IconName; text: string }[] = [
    { icon: "check", text: t("trustFree") },
    { icon: "home", text: t("trustNotBank") },
    { icon: "eye", text: t("trustPassword") },
    { icon: "heart", text: t("trustMadeIn") },
  ];

  const faq = (["Safe", "Free", "Bank", "ForMe", "Data", "Numbers"] as const).map((k) => ({
    q: t(`faq${k}Q`),
    a: t(`faq${k}A`),
  }));

  return (
    <div className="lp">
      <header className="lp-top lp-wrap">
        <span className="wordmark">Cuenta Clara</span>
        <LanguageToggle />
      </header>

      <main>
        {/* 1. Hero: headline, before/after, one button */}
        <section className="lp-wrap lp-hero">
          <div className="lp-hero__text">
            <h1 className="lp-headline">{t("headline")}</h1>
            <p className="t-body muted lp-sub">{t("sub")}</p>
          </div>

          <div className="lp-ba" aria-label={`${t("beforeLabel")} / ${t("afterLabel")}`}>
            <div className="lp-ba__card lp-ba__card--before">
              <p className="t-label">{t("beforeLabel")}</p>
              <p className="lp-ba__question">{t("beforeText")}</p>
            </div>
            <div className="lp-ba__card lp-ba__card--after">
              <p className="t-label">{t("afterLabel")}</p>
              <p className="t-body">{t("afterText")}</p>
              <p className="t-money-xl lp-ba__figure">{formatUSD(SAMPLE_LEFT)}</p>
            </div>
          </div>

          <div className="lp-hero__cta">
            <CtaLink placement="hero" id="hero-cta" className="btn btn--primary btn--cta btn--block">
              {t("cta")}
            </CtaLink>
            <p className="t-caption muted lp-center">{t("ctaMicro")}</p>
            <Link href="/login" className="t-label lp-center lp-login">
              {t("login")}
            </Link>
          </div>
        </section>

        {/* 2. Trust strip: true facts only */}
        <section className="lp-trust" aria-label={t("trustLabel")}>
          <ul className="lp-wrap lp-trust__list">
            {trust.map((item) => (
              <li key={item.text} className="lp-trust__item">
                <Icon name={item.icon} size={20} />
                <span className="t-label">{item.text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 3. How it works */}
        <section className="lp-wrap lp-section">
          <h2 className="t-title">{t("howTitle")}</h2>
          <ol className="lp-steps">
            {[t("how1"), t("how2"), t("how3")].map((step, i) => (
              <li key={i} className="lp-step">
                <span className="lp-step__num" aria-hidden>
                  {i + 1}
                </span>
                <span className="t-body">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* 4. Big number preview + second CTA */}
        <section className="lp-wrap lp-section lp-number">
          <div className="lp-number__text">
            <h2 className="t-title">{t("numberTitle")}</h2>
            <p className="t-body muted">{t("numberSub")}</p>
            <CtaLink placement="number" className="btn btn--primary btn--cta lp-desktop-inline">
              {t("cta")}
            </CtaLink>
          </div>
          <PhoneMock
            left={formatUSD(SAMPLE_LEFT)}
            labels={{
              month: d("greeting"),
              left: d("leftLabel"),
              bills: d("bills"),
              family: d("family"),
              savings: d("savings"),
              spending: d("spending"),
              tabs: [nav("home"), nav("sends"), nav("add"), nav("goals"), nav("settings")],
            }}
          />
          <CtaLink placement="number" className="btn btn--primary btn--cta btn--block lp-mobile-only">
            {t("cta")}
          </CtaLink>
        </section>

        {/* 5. Family sends */}
        <section className="lp-band">
          <div className="lp-wrap lp-section lp-sends">
            <div>
              <h2 className="t-title">{t("sendsTitle")}</h2>
              <p className="t-body lp-sends__sub">{t("sendsSub")}</p>
            </div>
            <div className="card lp-sends__card">
              <p className="t-label">{t("sendsMock")}</p>
              <div className="row row--between">
                <span className="t-heading num">{t("sendsMockPlan")}</span>
                <span className="t-label num lp-sends__receives">{t("sendsMockReceives")}</span>
              </div>
              <p className="t-caption muted">1 USD = RD$ 63.42</p>
              <div className="stack-sm">
                <div className="row row--between">
                  <span className="t-caption muted">{t("sendsMockProgress")}</span>
                  <span className="t-caption num">$100.00 / $200.00</span>
                </div>
                <div className="progress progress--mango" aria-hidden>
                  <div className="progress__fill" style={{ width: "50%" }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FAQ: closed accordion, six questions */}
        <section className="lp-wrap lp-section lp-faq">
          <h2 className="t-title">{t("faqTitle")}</h2>
          <div className="lp-faq__list">
            {faq.map((item) => (
              <details key={item.q} className="lp-faq__item">
                <summary className="t-heading">
                  {item.q}
                  <span className="lp-faq__chevron" aria-hidden>
                    <Icon name="plus" size={20} />
                  </span>
                </summary>
                <p className="t-body muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 7. Final CTA */}
        <section className="lp-wrap lp-final">
          <h2 className="t-title">{t("finalTitle")}</h2>
          <p className="t-body muted">{t("finalSub")}</p>
          <CtaLink placement="final" className="btn btn--primary btn--cta btn--block">
            {t("cta")}
          </CtaLink>
          <p className="saying">{t("saying")}</p>
        </section>
      </main>

      <StickyCta watchId="hero-cta">{t("cta")}</StickyCta>
    </div>
  );
}

/** Dashboard mock built from the brand tokens (the PRD's stand-in until a real screenshot). */
function PhoneMock({
  left,
  labels,
}: {
  left: string;
  labels: {
    month: string;
    left: string;
    bills: string;
    family: string;
    savings: string;
    spending: string;
    tabs: string[];
  };
}) {
  const bars = [
    { label: labels.bills, value: "$1,520.00", pct: 48, mango: false },
    { label: labels.family, value: "$200.00", pct: 7, mango: true },
    { label: labels.savings, value: "$150.00", pct: 5, mango: false },
    { label: labels.spending, value: "$917.50", pct: 29, mango: false },
  ];
  return (
    <div className="phone" aria-hidden>
      <div className="phone__screen">
        <p className="phone__month">{labels.month}</p>
        <div className="phone__hero">
          <p className="t-caption muted">{labels.left}</p>
          <p className="phone__figure">{left}</p>
        </div>
        <div className="phone__bars">
          {bars.map((b) => (
            <div key={b.label} className="phone__bar">
              <div className="row row--between">
                <span className="t-caption">{b.label}</span>
                <span className="t-caption num">{b.value}</span>
              </div>
              <div className={b.mango ? "progress progress--mango" : "progress"}>
                <div className="progress__fill" style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="phone__tabs">
          {labels.tabs.map((tab, i) => (
            <span key={tab} className={i === 0 ? "phone__tab phone__tab--on" : "phone__tab"}>
              {tab}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
