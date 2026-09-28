"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "./Icon";

/** The way in to Clara, on Home and the checkup page. Free and Plus (with different limits). */
export function ClaraCard() {
  const t = useTranslations("clara");
  const examples = t.raw("suggestions") as string[];
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
