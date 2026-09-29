"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { useSafeToSpend } from "./SafeToSpend";
import { formatShortDate } from "@/lib/dates";
import { formatUSD } from "@/lib/money";

const HIDE_KEY = "cc-hide-amounts";

/**
 * The top of Home: one big number (Safe to Spend once a balance and payday are
 * set, otherwise what's left this month), an eye to hide it in public, and four
 * round quick actions.
 */
export function HomeHero({ left, hasIncome }: { left: number; hasIncome: boolean }) {
  const t = useTranslations("homeHero");
  const safe = useTranslations("safe");
  const locale = useLocale();
  const sts = useSafeToSpend();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(HIDE_KEY) === "1");
    } catch {
      // storage blocked: amounts stay visible
    }
  }, []);
  function toggle() {
    const next = !hidden;
    setHidden(next);
    try {
      localStorage.setItem(HIDE_KEY, next ? "1" : "0");
    } catch {
      // nothing to remember with
    }
  }

  const value = sts ? sts.safe : left;
  const actions: { href: string; icon: IconName | "clara"; label: string }[] = [
    { href: "/app/add", icon: "plus", label: t("log") },
    { href: "/app/envios", icon: "send", label: t("send") },
    { href: "/app/clara", icon: "clara", label: "Clara" },
    { href: "/app/metas", icon: "target", label: t("goals") },
  ];

  return (
    <section className="home-hero" aria-label={sts ? safe("title") : t("left")}>
      <p className="t-label muted home-hero__label">
        {sts ? safe("title") : t("left")}
        <button type="button" className="home-hero__eye" aria-label={hidden ? t("show") : t("hide")} aria-pressed={hidden} onClick={toggle}>
          <Icon name="eye" size={18} />
        </button>
      </p>
      <p className={value < 0 ? "home-hero__big home-hero__big--neg" : "home-hero__big"}>{hidden ? "••••" : formatUSD(value)}</p>
      {(sts || hasIncome) && (
        <p className="home-hero__sub">
          {sts
            ? safe("untilPayday", { date: formatShortDate(sts.payday, locale), days: sts.daysToPayday }) +
              (sts.perDay !== null && !hidden ? ` · ${safe("perDay", { amount: formatUSD(sts.perDay) })}` : "")
            : t("afterPlan")}
        </p>
      )}
      <nav className="quick-actions" aria-label={t("actions")}>
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="quick-action">
            <span className="quick-action__circle" aria-hidden>
              {a.icon === "clara" ? <span className="quick-action__letter">C</span> : <Icon name={a.icon} size={26} />}
            </span>
            {a.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
