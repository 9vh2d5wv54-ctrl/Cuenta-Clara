import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/Icon";
import { LanguageToggle } from "@/components/LanguageToggle";
import { CtaLink } from "@/components/landing/CtaLink";
import { StickyCta } from "@/components/landing/StickyCta";
import { AuthHashForward } from "@/components/AuthHashForward";
import { formatUSD } from "@/lib/money";
import { OrbMark } from "@/components/ClaraCard";

// The ad landing page (Cuenta Clara Landing Page PRD). Order follows the teardown:
// result and trust first, then the pitch, then doubts, then the ask again.
// No invented stats or testimonials: the trust strip holds true facts until real
// results exist.

const SAMPLE_LEFT = 41250;

export default async function Landing() {
  const t = await getTranslations("landing");
  const hh = await getTranslations("homeHero");
  const locale = await getLocale();
  const monthName = new Date().toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "long", year: "numeric" });
  const nav = await getTranslations("nav");
  const ac = await getTranslations("academy");
  const w = await getTranslations("words");
  const lg = await getTranslations("legal");

  const trust: { icon: IconName; text: string }[] = [
    { icon: "check", text: t("trustFree") },
    { icon: "home", text: t("trustNotBank") },
    { icon: "eye", text: t("trustPassword") },
    { icon: "globe", text: t("trustBuiltFor") },
  ];

  const vetTools: { icon: IconName; title: string; text: string }[] = [
    { icon: "heart", title: t("vetDisabilityTitle"), text: t("vetDisabilityText") },
    { icon: "target", title: t("vetGiTitle"), text: t("vetGiText") },
    { icon: "check", title: t("vetBenefitsTitle"), text: t("vetBenefitsText") },
  ];

  const faq = (["Safe", "Free", "Bank", "ForMe", "Data", "Numbers"] as const).map((k) => ({
    q: t(`faq${k}Q`),
    a: t(`faq${k}A`),
  }));

  return (
    <div className="lp">
      <AuthHashForward />
      <header className="lp-top lp-wrap">
        <span className="wordmark">Cuenta Clara</span>
        <LanguageToggle />
      </header>

      <main>
        {/* 1. Hero: headline, the app floating in glass, one button */}
        <section className="lp-wrap lp-hero">
          <div className="lp-hero__text">
            <p className="lp-eyebrow">
              <span aria-hidden>✦</span> {t("heroEyebrow")}
            </p>
            <h1 className="lp-headline">
              {t("heroLine1")} <span className="lp-glow-text">{t("heroLine2")}</span>
              <span className="lp-headline__small">{t("heroLine3")}</span>
            </h1>
            <p className="lp-sub">{t("heroSub")}</p>
          </div>

          <HeroArt
            labels={{
              safe: t("artSafe"),
              onTrack: t("artOnTrack"),
              ask: t("artAsk"),
              answer: t("artAnswer"),
              send: t("artSend"),
              sent: t("artSent"),
            }}
            amount={formatUSD(SAMPLE_LEFT)}
          />

          <div className="lp-hero__cta">
            <CtaLink placement="hero" id="hero-cta" className="btn btn--primary btn--cta btn--block lp-cta-glow">
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
              hello: t("mockHello"),
              month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
              left: hh("left"),
              onTrack: hh("onTrack"),
              ring: hh("ringLabel"),
              progress: hh("progress"),
              goals: [
                { name: t("mockGoal1"), saved: "$1,250", pct: 25, tone: "clara" },
                { name: t("mockGoal2"), saved: "$744", pct: 62, tone: "violet" },
              ],
              actions: [hh("send"), hh("goals"), hh("log"), "Clara"],
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

        {/* 6. Veterans: built by a veteran; free tools, estimates only */}
        <section className="lp-band lp-band--clara">
          <div className="lp-wrap lp-section">
            <div className="stack-sm">
              <p className="t-label lp-eyebrow">{t("vetEyebrow")}</p>
              <h2 className="t-title">{t("vetTitle")}</h2>
              <p className="t-body">{t("vetSub")}</p>
            </div>
            <ul className="lp-features">
              {vetTools.map((tool) => (
                <li key={tool.title} className="card lp-feature">
                  <Icon name={tool.icon} />
                  <span className="stack-sm">
                    <span className="t-heading">{tool.title}</span>
                    <span className="t-body muted">{tool.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <CtaLink placement="veterans" className="btn btn--primary btn--cta lp-self-start">
              {t("cta")}
            </CtaLink>
            <p className="t-caption muted">{t("vetNote")}</p>
          </div>
        </section>

        {/* 7. Free tools, no account needed */}
        <section className="lp-wrap lp-section">
          <h2 className="t-title">{t("freeTitle")}</h2>
          <div className="lp-features">
            <Link href="/estilo" className="card lp-feature lp-feature--link">
              <Icon name="heart" />
              <span className="stack-sm grow">
                <span className="t-heading">{t("quizTitle")}</span>
                <span className="t-body muted">{t("quizText")}</span>
              </span>
              <Icon name="forward" size={20} />
            </Link>
            <Link href="/aprende" className="card lp-feature lp-feature--link">
              <Icon name="info" />
              <span className="stack-sm grow">
                <span className="t-heading">{t("lessonsTitle")}</span>
                <span className="t-body muted">{t("lessonsText")}</span>
              </span>
              <Icon name="forward" size={20} />
            </Link>
            <Link href="/palabras" className="card lp-feature lp-feature--link">
              <Icon name="globe" />
              <span className="stack-sm grow">
                <span className="t-heading">{w("landingTitle")}</span>
                <span className="t-body muted">{w("landingText")}</span>
              </span>
              <Icon name="forward" size={20} />
            </Link>
          </div>
        </section>

        {/* 8. FAQ: closed accordion, six questions */}
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

        {/* 9. Final CTA */}
        <section className="lp-wrap lp-final">
          <h2 className="t-title">{t("finalTitle")}</h2>
          <p className="t-body muted">{t("finalSub")}</p>
          <CtaLink placement="final" className="btn btn--primary btn--cta btn--block">
            {t("cta")}
          </CtaLink>
          <p className="saying">{t("saying")}</p>
          <Link href="/aprende" className="t-label">
            {ac("homeLink")}
          </Link>
        </section>
        <p className="lp-wrap t-caption muted lp-legal">
          <Link href="/privacidad">{lg("privacy")}</Link> · <Link href="/terminos">{lg("terms")}</Link>
        </p>
      </main>

      <StickyCta watchId="hero-cta">{t("cta")}</StickyCta>
    </div>
  );
}

/** The hero picture: Clara's orb with three glass cards from the app floating around it (sample numbers). */
function HeroArt({ labels, amount }: { labels: Record<"safe" | "onTrack" | "ask" | "answer" | "send" | "sent", string>; amount: string }) {
  return (
    <div className="lp-art" aria-hidden>
      <span className="lp-art__aurora lp-art__aurora--1" />
      <span className="lp-art__aurora lp-art__aurora--2" />
      <span className="lp-art__grid" />
      <div className="lp-art__orb">
        <OrbMark size="lg" />
      </div>
      <div className="lp-float lp-float--safe">
        <p className="lp-float__label">
          <Icon name="shield" size={12} /> {labels.safe}
        </p>
        <p className="lp-float__big">{amount}</p>
        <p className="lp-float__ok">{labels.onTrack} ✓</p>
      </div>
      <div className="lp-float lp-float--clara">
        <p className="lp-float__ask">{labels.ask}</p>
        <p className="lp-float__answer">
          <span className="lp-float__c">C</span>
          {labels.answer}
        </p>
      </div>
      <div className="lp-float lp-float--send">
        <p className="lp-float__row">
          <span className="lp-float__avatar">M</span>
          <span className="grow">{labels.send}</span>
          <span className="lp-float__tag">{labels.sent}</span>
        </p>
        <span className="lp-float__bar">
          <span />
        </span>
      </div>
    </div>
  );
}

/** Home mock built from the app's own tokens (the PRD's stand-in until a real screenshot). */
function PhoneMock({
  left,
  labels,
}: {
  left: string;
  labels: {
    hello: string;
    month: string;
    left: string;
    onTrack: string;
    ring: string;
    progress: string;
    goals: { name: string; saved: string; pct: number; tone: "clara" | "positive" | "violet" }[];
    actions: string[];
    tabs: string[];
  };
}) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const icons: (IconName | "clara")[] = ["send", "target", "list", "clara"];
  const tones = ["clara", "positive", "violet", "clara"];
  return (
    <div className="phone" aria-hidden>
      <div className="phone__screen">
        <div>
          <p className="phone__hello">{labels.hello} 👋</p>
          <p className="phone__month">{labels.month}</p>
        </div>
        <div className="phone__hero">
          <div className="phone__hero-main">
            <p className="phone__label">
              <Icon name="shield" size={11} />
              {labels.left}
            </p>
            <p className="phone__figure">{left}</p>
            <p className="phone__ok">{labels.onTrack} ✓</p>
          </div>
          <div className="phone__ring">
            <svg viewBox="0 0 64 64">
              <circle cx="32" cy="32" r={r} className="phone__ring-track" />
              <circle cx="32" cy="32" r={r} className="phone__ring-fill" strokeDasharray={`${c * 0.58} ${c}`} transform="rotate(-90 32 32)" />
            </svg>
            <span>58%</span>
          </div>
        </div>
        <p className="phone__section">{labels.progress}</p>
        <div className="phone__card">
          {labels.goals.map((g) => (
            <div key={g.name} className="phone__goal">
              <span className={`phone__goal-icon goal-icon--${g.tone}`}>
                <Icon name={g.tone === "clara" ? "shield" : "globe"} size={12} />
              </span>
              <div className="grow">
                <div className="row row--between">
                  <span className="phone__goal-name">{g.name}</span>
                  <span className={`phone__goal-pct tone-${g.tone}`}>{g.pct}%</span>
                </div>
                <span className={`bar bar--${g.tone} phone__goal-bar`}>
                  <span style={{ width: `${g.pct}%` }} />
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="phone__actions">
          {labels.actions.map((a, i) => (
            <span key={a} className="phone__action">
              <span className={`phone__action-icon tone-${tones[i]}`}>
                {icons[i] === "clara" ? <span className="phone__c">C</span> : <Icon name={icons[i] as IconName} size={13} />}
              </span>
              {a}
            </span>
          ))}
        </div>
        <div className="phone__tabs">
          {labels.tabs.map((tab, i) => (
            <span key={tab} className={i === 0 ? "phone__tab phone__tab--on" : i === 2 ? "phone__tab phone__tab--add" : "phone__tab"}>
              {i === 2 ? <span className="phone__plus">+</span> : tab}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
