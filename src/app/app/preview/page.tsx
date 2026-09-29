"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useData } from "@/components/DataProvider";
import { Icon, type IconName } from "@/components/Icon";
import { summarize } from "@/lib/budget";
import type { ClaraData } from "@/lib/clara-tools";
import { formatShortDate, todayISO } from "@/lib/dates";
import { formatUSD } from "@/lib/money";
import { nextPayday, safeToSpend } from "@/lib/safe-to-spend";
import { whatIfChart } from "@/lib/what-if";

// "Midnight" design preview (not linked from the app): the Home screen in a dark
// navy style with round quick actions and a glowing balance chart, built from the
// person's own numbers. Nothing here changes the real Home screen.

type Accent = "blue" | "green";
const ACCENT_KEY = "cc-midnight-accent";

export default function MidnightPreview() {
  const t = useTranslations("midnight");
  const cat = useTranslations("add.categories");
  const nav = useTranslations("nav");
  const locale = useLocale();
  const { profile, income, bills, recipients, goals, entries, recent, debts, subscription, taxPct } = useData();
  const [accent, setAccent] = useState<Accent>("blue");
  const [slide, setSlide] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACCENT_KEY);
      if (saved === "blue" || saved === "green") setAccent(saved);
    } catch {
      // storage blocked: default accent
    }
  }, []);
  function pickAccent(a: Accent) {
    setAccent(a);
    try {
      localStorage.setItem(ACCENT_KEY, a);
    } catch {
      // nothing to remember with
    }
  }

  const now = new Date();
  const today = todayISO(now);
  const month = now.toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "long", year: "numeric" });
  const s = summarize(income ?? 0, bills, recipients, goals, entries, now, taxPct);
  const payday = profile?.payday_anchor && profile.payday_cycle ? nextPayday(profile.payday_anchor, profile.payday_cycle, today) : null;
  const sts =
    profile?.balance_cents != null && profile.balance_on && payday
      ? safeToSpend({ balance: profile.balance_cents, balanceOn: profile.balance_on, payday, buffer: profile.buffer_cents ?? 0, bills, recipients, recent, now })
      : null;
  const hero = sts ? sts.safe : s.left;

  const data: ClaraData = { profile, income: income ?? 0, bills, recipients, goals, recent, debts, subscription, taxPct };
  const chart = whatIfChart(data, { scenario: "spend_once", amount: 0, label: "" }, now);

  const upcoming = bills
    .map((b) => {
      for (let i = 0; i < 14; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        if (Math.min(b.due_day, last) === d.getDate()) return { bill: b, date: todayISO(d), days: i };
      }
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  const actions: { href: string; icon: IconName; label: string }[] = [
    { href: "/app/add", icon: "plus", label: t("log") },
    { href: "/app/envios", icon: "send", label: t("send") },
    { href: "/app/clara", icon: "info", label: "Clara" },
    { href: "/app/metas", icon: "target", label: t("goals") },
  ];
  const slides = [
    { title: t("claraTitle"), text: t("claraText"), href: "/app/clara", cta: t("claraCta") },
    { title: t("lessonTitle"), text: t("lessonText"), href: "/aprende", cta: t("lessonCta") },
    { title: t("vetTitle"), text: t("vetText"), href: "/app/veteranos/beneficios", cta: t("vetCta") },
  ];

  return (
    <div className={`mn mn--${accent}`}>
      <main className="mn__page">
        <div className="mn__notice">
          <span>{t("previewNote")}</span>
          <div className="mn__accents" role="radiogroup" aria-label={t("accent")}>
            {(["blue", "green"] as const).map((a) => (
              <button key={a} type="button" role="radio" aria-checked={accent === a} className={accent === a ? "mn__chip mn__chip--on" : "mn__chip"} onClick={() => pickAccent(a)}>
                <span className={`mn__swatch mn__swatch--${a}`} aria-hidden />
                {t(a)}
              </button>
            ))}
          </div>
        </div>

        <header className="mn__top">
          <div>
            <p className="mn__muted mn__cap">{month.charAt(0).toUpperCase() + month.slice(1)}</p>
            <p className="mn__hello">{t("hello")}</p>
          </div>
          <Link href="/app/clara" className="mn__iconbtn" aria-label="Clara">
            <span className="mn__avatar">C</span>
          </Link>
        </header>

        <section className="mn__hero">
          <p className="mn__muted">
            {sts ? t("safe") : t("left")}{" "}
            <button type="button" className="mn__eye" aria-label={hidden ? t("show") : t("hide")} onClick={() => setHidden(!hidden)}>
              <Icon name="eye" size={18} />
            </button>
          </p>
          <p className={hero < 0 ? "mn__big mn__big--neg" : "mn__big"}>{hidden ? "••••" : formatUSD(hero)}</p>
          <p className="mn__sub">
            {sts && payday ? t("untilPayday", { date: formatShortDate(payday, locale), days: sts.daysToPayday }) : t("thisMonth")}
            {sts?.perDay ? ` · ${t("perDay", { amount: formatUSD(sts.perDay) })}` : ""}
          </p>
        </section>

        <nav className="mn__actions" aria-label={t("actions")}>
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className="mn__action">
              <span className="mn__circle">
                {a.href === "/app/clara" ? <span className="mn__letter">C</span> : <Icon name={a.icon} size={26} />}
              </span>
              {a.label}
            </Link>
          ))}
        </nav>

        <section className="mn__card mn__promo" aria-roledescription="carousel">
          <div className="mn__promo-body">
            <p className="mn__h">{slides[slide].title}</p>
            <p className="mn__muted">{slides[slide].text}</p>
            <Link href={slides[slide].href} className="mn__btn">
              {slides[slide].cta}
            </Link>
          </div>
          <div className="mn__dots">
            {slides.map((sl, i) => (
              <button key={sl.title} type="button" className={i === slide ? "mn__dot mn__dot--on" : "mn__dot"} aria-label={`${i + 1}/${slides.length}`} onClick={() => setSlide(i)} />
            ))}
            <span className="mn__count">
              {slide + 1}/{slides.length}
            </span>
          </div>
        </section>

        {chart && (
          <section className="mn__card">
            <div className="mn__row">
              <p className="mn__h">{t("chartTitle")}</p>
              <span className="mn__pill">{t("days30")}</span>
            </div>
            <GlowChart days={chart.days.slice(0, 31)} locale={locale} todayLabel={t("today")} paydayLabel={t("payday")} />
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="mn__list">
            <div className="mn__row">
              <p className="mn__h">{t("dueSoon")}</p>
              <Link href="/app/ajustes" className="mn__link">
                {t("seeAll")}
              </Link>
            </div>
            {upcoming.map((u) => (
              <div key={u.bill.id} className="mn__item">
                <span className="mn__itemicon">
                  <Icon name="calendar" size={20} />
                </span>
                <div className="mn__grow">
                  <p>{u.bill.name}</p>
                  <p className="mn__muted mn__small">{u.days === 0 ? t("today") : t("inDays", { days: u.days })}</p>
                </div>
                <p className="mn__num">{formatUSD(u.bill.amount_cents)}</p>
              </div>
            ))}
          </section>
        )}

        {entries.length > 0 && (
          <section className="mn__list">
            <p className="mn__h">{t("recent")}</p>
            {entries.slice(0, 4).map((e) => (
              <div key={e.id} className="mn__item">
                <span className="mn__itemicon">
                  <Icon name={e.type === "send" ? "send" : e.type === "income" ? "plus" : "check"} size={20} />
                </span>
                <div className="mn__grow">
                  <p>{e.note || cat(e.category)}</p>
                  <p className="mn__muted mn__small">{formatShortDate(e.date, locale)}</p>
                </div>
                <p className={e.type === "income" ? "mn__num mn__num--in" : "mn__num"}>
                  {e.type === "income" ? "+" : "−"}
                  {formatUSD(e.amount_cents)}
                </p>
              </div>
            ))}
          </section>
        )}

        <Link href="/app" className="mn__back">
          ← {t("backToApp")}
        </Link>
      </main>
      <nav className="mn__tabs" aria-label="Cuenta Clara">
        {([
          ["/app/preview", "home", nav("home")],
          ["/app/envios", "send", nav("sends")],
          ["/app/add", "plus", nav("add")],
          ["/app/metas", "target", nav("goals")],
          ["/app/ajustes", "settings", nav("settings")],
        ] as [string, IconName, string][]).map(([href, icon, label], i) => (
          <Link key={href} href={href} className={i === 0 ? "mn__tab mn__tab--on" : "mn__tab"}>
            <span className={icon === "plus" ? "mn__tabicon mn__tabicon--add" : "mn__tabicon"}>
              <Icon name={icon} size={22} />
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** One glowing line with a soft wash under it; crosshair tooltip on touch/hover. */
function GlowChart({ days, locale, todayLabel, paydayLabel }: { days: { date: string; planned: number; payday: boolean }[]; locale: string; todayLabel: string; paydayLabel: string }) {
  const W = 340;
  const H = 150;
  const pad = { top: 12, bottom: 22, left: 4, right: 4 };
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const vals = days.map((d) => d.planned);
  const lo = Math.min(...vals, 0);
  const hi = Math.max(...vals, 1);
  const x = (i: number) => pad.left + (i / (days.length - 1)) * (W - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - (v - lo) / (hi - lo || 1)) * (H - pad.top - pad.bottom);
  const line = days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.planned).toFixed(1)}`).join("");
  const area = `${line}L${x(days.length - 1)},${H - pad.bottom}L${x(0)},${H - pad.bottom}Z`;
  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round((((e.clientX - box.left) / box.width) * W - pad.left) / (W - pad.left - pad.right) * (days.length - 1));
    setHover(Math.max(0, Math.min(days.length - 1, i)));
  };
  const h = hover === null ? null : days[hover];
  return (
    <div className="mn__chart">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${formatUSD(days[0].planned)} → ${formatUSD(days[days.length - 1].planned)}`} onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="mn-wash" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--mn-accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--mn-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {lo < 0 && <line x1={0} x2={W} y1={y(0)} y2={y(0)} className="mn__zero" />}
        {days.map((d, i) => (d.payday ? <line key={d.date} x1={x(i)} x2={x(i)} y1={pad.top} y2={H - pad.bottom} className="mn__payday" /> : null))}
        <path d={area} fill="url(#mn-wash)" />
        <path d={line} className="mn__line" />
        <circle cx={x(days.length - 1)} cy={y(days[days.length - 1].planned)} r={4} className="mn__enddot" />
        {h && hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={H - pad.bottom} className="mn__cross" />
            <circle cx={x(hover)} cy={y(h.planned)} r={5} className="mn__enddot" />
          </>
        )}
        <text x={pad.left} y={H - 5} className="mn__tick">
          {todayLabel}
        </text>
        <text x={W - pad.right} y={H - 5} textAnchor="end" className="mn__tick">
          {formatShortDate(days[days.length - 1].date, locale)}
        </text>
      </svg>
      {h && (
        <div className="mn__tip" style={{ left: `clamp(60px, ${(x(hover!) / W) * 100}%, calc(100% - 60px))` }}>
          <strong>{formatUSD(h.planned)}</strong>
          <span>
            {formatShortDate(h.date, locale)}
            {h.payday ? ` · ${paydayLabel}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
