"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "./Icon";
import { localizeDollars } from "@/lib/money";

/** The way in to Clara, on Home and the checkup page. Free and Plus (with different limits). */
export function ClaraCard() {
  const t = useTranslations("clara");
  const examples = (t.raw("suggestions") as string[]).map(localizeDollars);
  return (
    <div className="card card--clara stack-sm">
      <Link href="/app/clara" className="row" style={{ textDecoration: "none", color: "inherit" }}>
        <span className="clara-avatar" aria-hidden>
          C
        </span>
        <span className="grow stack-sm">
          <span className="t-heading">{t("cardTitle")}</span>
          <span className="t-caption muted">{t("cardLead")}</span>
        </span>
        <Icon name="forward" size={20} />
      </Link>
      <div className="clara-chips">
        {examples.slice(0, 2).map((q) => (
          <Link key={q} href={`/app/clara?q=${encodeURIComponent(q)}`} className="clara-chip t-caption">
            {q}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Home's Clara section: a glowing orb, three questions to tap, and a way into the chat. */
export function ClaraOrb() {
  const t = useTranslations("clara");
  const examples = (t.raw("suggestions") as string[]).map(localizeDollars);
  return (
    <section className="clara-orb card" aria-labelledby="clara-orb-title">
      <div className="clara-orb__top">
        <div className="stack-sm grow">
          <h2 id="clara-orb-title" className="clara-orb__title">
            {t("orbTitle")}
          </h2>
          <p className="t-body muted">{t("orbLead")}</p>
        </div>
        <OrbMark />
      </div>
      <ul className="clara-orb__questions">
        {examples.slice(0, 3).map((q) => (
          <li key={q}>
            <Link href={`/app/clara?q=${encodeURIComponent(q)}`} className="clara-orb__q">
              <span aria-hidden className="clara-orb__spark">
                ✦
              </span>
              “{q}”
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/app/clara" className="clara-orb__cta">
        <span className="clara-orb__cta-c" aria-hidden>
          C
        </span>
        {t("orbCta")}
        <Icon name="forward" size={18} />
      </Link>
    </section>
  );
}

/** Clara's glowing orb. xs: next to her messages; sm: headers; md: Home; lg: an empty chat. */
export function OrbMark({ size = "md" }: { size?: "xs" | "sm" | "md" | "lg" }) {
  return (
    <span className={`orb orb--${size}`} aria-hidden>
      {size !== "xs" && <span className="orb__ring orb__ring--1" />}
      {size !== "xs" && <span className="orb__ring orb__ring--2" />}
      <span className="orb__core">C</span>
    </span>
  );
}
