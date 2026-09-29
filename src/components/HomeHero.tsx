"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useData } from "./DataProvider";
import { Icon, type IconName } from "./Icon";
import { LanguageToggle } from "./LanguageToggle";
import { useSafeToSpend } from "./SafeToSpend";
import { goalLook } from "@/lib/goal-look";
import { readName } from "@/lib/home-name";
import { formatUSD } from "@/lib/money";

const HIDE_KEY = "cc-hide-amounts";

/**
 * The top of Home: a greeting, then one hero card with the number that matters
 * (Safe to Spend once a balance and payday are set, otherwise what's left this
 * month), how it's going, and a ring for how much of this month's spending money
 * is still there. The eye hides amounts in public.
 */
export function HomeHero({ left, spendable, hasIncome }: { left: number; spendable: number; hasIncome: boolean }) {
  const t = useTranslations("homeHero");
  const safe = useTranslations("safe");
  const locale = useLocale();
  const sts = useSafeToSpend();
  const [hidden, setHidden] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    setName(readName());
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

  const now = new Date();
  const monthName = now.toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "long", year: "numeric" });
  const month = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const value = sts ? sts.safe : left;
  // Share of this month's spending money (after bills, sends, savings) still there,
  // against the share of the month still to go.
  const pctLeft = hasIncome && spendable > 0 ? Math.max(0, Math.min(1, left / spendable)) : null;
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthLeft = (dim - now.getDate() + 1) / dim;
  const status: "over" | "fast" | "ok" | null =
    value < 0 ? "over" : pctLeft !== null && pctLeft + 0.1 < monthLeft ? "fast" : sts || hasIncome ? "ok" : null;
  const money = (cents: number) => (hidden ? "••••" : formatUSD(cents));

  return (
    <>
      <header className="greet">
        <div>
          <h1 className="greet__hello">{name ? t("hello", { name }) : t("helloNoName")} <span aria-hidden>👋</span></h1>
          <p className="t-caption muted">{month}</p>
        </div>
        <LanguageToggle />
      </header>

      <section className="hero-card" aria-label={sts ? safe("title") : t("left")}>
        <span className="hero-card__sparkles" aria-hidden />
        <div className="hero-card__main">
          <p className="hero-card__label">
            <Icon name="shield" size={18} />
            {sts ? safe("title") : t("left")}
          </p>
          <p className={["hero-card__big", value < 0 && "hero-card__big--neg", money(value).length > 8 && (money(value).length > 10 ? "hero-card__big--xlong" : "hero-card__big--long")].filter(Boolean).join(" ")}>{money(value)}</p>
          {status && (
            <p className={`hero-card__status hero-card__status--${status}`}>
              {status === "over" ? t("over", { amount: money(-value) }) : status === "fast" ? t("fast") : t("onTrack")}
              {status === "ok" && (
                <span className="hero-card__check" aria-hidden>
                  <Icon name="check" size={12} />
                </span>
              )}
            </p>
          )}
          {(sts || hasIncome) && (
            <div className="hero-card__foot">
              {sts ? (
                <>
                  <p>{t("paydayIn", { days: sts.daysToPayday })}</p>
                  {sts.perDay !== null && <p className="muted">{t("perDay", { amount: money(sts.perDay) })}</p>}
                </>
              ) : (
                <p className="muted">{t("afterPlan")}</p>
              )}
            </div>
          )}
        </div>
        <div className="hero-card__side">
          <button type="button" className="hero-card__eye" aria-label={hidden ? t("show") : t("hide")} aria-pressed={hidden} onClick={toggle}>
            <Icon name="eye" size={18} />
          </button>
          {pctLeft !== null && value >= 0 && <Ring value={pctLeft} label={t("ringLabel")} aria={t("ringAria", { pct: Math.round(pctLeft * 100) })} />}
        </div>
      </section>
    </>
  );
}

function Ring({ value, label, aria }: { value: number; label: string; aria: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={aria}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={r} className="ring__track" />
        <circle cx="50" cy="50" r={r} className="ring__fill" strokeDasharray={`${c * value} ${c}`} transform="rotate(-90 50 50)" />
      </svg>
      <span className="ring__text" aria-hidden>
        <strong>{Math.round(value * 100)}%</strong>
        <span>{label}</span>
      </span>
    </div>
  );
}

/** Home's "Your progress": the first three goals, with a bar each. */
export function GoalProgress() {
  const t = useTranslations("homeHero");
  const { goals } = useData();
  // Unfinished goals first.
  const shown = [...goals.map((g, i) => ({ g, i }))].sort((a, b) => Number(a.g.saved_cents >= a.g.target_cents) - Number(b.g.saved_cents >= b.g.target_cents)).slice(0, 3);
  return (
    <section className="stack-sm">
      <div className="row row--between">
        <h2 className="t-heading">{t("progress")}</h2>
        {goals.length > 0 && (
          <Link href="/app/metas" className="t-label">
            {t("seeAll")}
          </Link>
        )}
      </div>
      {shown.length === 0 ? (
        <Link href="/app/metas" className="card row progress-empty">
          <span className="goal-icon goal-icon--clara" aria-hidden>
            <Icon name="target" size={22} />
          </span>
          <span className="grow stack-sm">
            <span className="t-label">{t("noGoals")}</span>
            <span className="t-caption muted">{t("noGoalsLead")}</span>
          </span>
          <Icon name="forward" size={20} />
        </Link>
      ) : (
        <ul className="card progress-list">
          {shown.map(({ g, i }) => {
            const { icon, tone } = goalLook(g.name, i);
            const pct = g.target_cents > 0 ? Math.min(1, g.saved_cents / g.target_cents) : 0;
            return (
              <li key={g.id} className="progress-row">
                <span className={`goal-icon goal-icon--${tone}`} aria-hidden>
                  <Icon name={icon} size={22} />
                </span>
                <div className="grow stack-sm">
                  <div className="row row--between">
                    <span className="t-label">{g.name}</span>
                    <span className={`t-label num tone-${tone}`}>{Math.round(pct * 100)}%</span>
                  </div>
                  <span className="t-caption muted num">
                    {formatUSD(g.saved_cents)} {t("of")} {formatUSD(g.target_cents)}
                  </span>
                  <span className={`bar bar--${tone}`} role="progressbar" aria-label={g.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)}>
                    <span style={{ width: `${pct * 100}%` }} />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Four quick actions as rounded cards. */
export function QuickActions() {
  const t = useTranslations("homeHero");
  const actions: { href: string; icon: IconName | "clara"; label: string; sub: string; tone: string }[] = [
    { href: "/app/envios", icon: "send", label: t("send"), sub: t("sendSub"), tone: "clara" },
    { href: "/app/metas", icon: "target", label: t("goals"), sub: t("goalsSub"), tone: "positive" },
    { href: "/app/add", icon: "list", label: t("log"), sub: t("logSub"), tone: "violet" },
    { href: "/app/clara", icon: "clara", label: "Clara", sub: t("claraSub"), tone: "clara" },
  ];
  return (
    <section className="stack-sm">
      <h2 className="t-heading">{t("actions")}</h2>
      <nav className="action-grid" aria-label={t("actions")}>
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="action-card">
            <span className={`action-card__icon tone-${a.tone}`} aria-hidden>
              {a.icon === "clara" ? <span className="action-card__letter">C</span> : <Icon name={a.icon} size={26} />}
            </span>
            <span className="stack-sm">
              <span className="t-label">{a.label}</span>
              <span className="t-caption muted">{a.sub}</span>
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
