"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useData } from "@/components/DataProvider";
import { Explain } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PaycheckCard } from "@/components/Paycheck";
import { TaxCard } from "@/components/Taxes";
import { HealthCard } from "@/components/Health";
import { WarningsCard } from "@/components/Warnings";
import { PatternsCard } from "@/components/Patterns";
import { SafeToSpendCard, useSafeToSpend } from "@/components/SafeToSpend";
import { GoalProgress, HomeHero, QuickActions } from "@/components/HomeHero";
import { ClaraOrb } from "@/components/ClaraCard";
import { VeteranCard } from "@/components/VeteranCard";
import { InstallCard } from "@/components/InstallCard";
import { FeedbackButton } from "@/components/Feedback";
import { summarize } from "@/lib/budget";
import { daysBetween, formatShortDate, nextDueDate } from "@/lib/dates";
import { formatUSD } from "@/lib/money";
import { setupSeen } from "@/lib/setup-prompt";
import { hasPlus } from "@/lib/plan";

export default function Dashboard() {
  const t = useTranslations("dashboard");
  const x = useTranslations("explain");
  const cat = useTranslations("add.categories");
  const locale = useLocale();
  const ch = useTranslations("checkup");
  const { income, bills, recipients, goals, entries, checkup, profile, subscription, taxPct } = useData();
  const tp = useTranslations("paystub");
  const ac = useTranslations("academy");
  const ms = useTranslations("moneyStyle");
  const tx = useTranslations("taxes");
  const fb = useTranslations("feedback");
  const router = useRouter();
  const sts = useSafeToSpend();

  // A brand-new account with nothing entered goes straight to setup, once.
  const brandNew = income === null && bills.length === 0 && recipients.length === 0 && goals.length === 0;
  useEffect(() => {
    if (brandNew && profile && !setupSeen(profile.id)) router.replace("/app/setup");
  }, [brandNew, profile, router]);

  const s = summarize(income ?? 0, bills, recipients, goals, entries, undefined, taxPct);
  const base = Math.max(s.income, 1);
  const negative = s.left < 0;

  const today = new Date();
  const upcoming = bills
    .map((b) => ({ bill: b, days: daysBetween(today, nextDueDate(b.due_day, today)) }))
    .filter((u) => u.days <= 7)
    .sort((a, b) => a.days - b.days);

  const rows = [
    { key: "bills", label: t("bills"), value: s.bills, tone: "clara" as const, explain: x("bills") },
    { key: "family", label: t("family"), value: s.family, tone: "mango" as const, explain: x("family") },
    { key: "savings", label: t("savings"), value: s.savings, tone: "clara" as const, explain: x("savings") },
    ...(s.taxes > 0 ? [{ key: "taxes", label: tx("row"), value: s.taxes, tone: "clara" as const, explain: tx("explain", { pct: taxPct }) }] : []),
    { key: "spending", label: t("spending"), value: s.spending, tone: "clara" as const, explain: x("spending") },
  ];

  return (
    <main className="page">
      <HomeHero left={s.left} spendable={s.left + s.spending} hasIncome={income !== null} />

      {(income === null || bills.length === 0) && (
        <Link href="/app/setup" className="notice notice--link">
          <Icon name="info" />
          <span className="stack-sm grow">
            <span className="t-body">{income === null ? t("nudgeIncome") : t("nudgeBill")}</span>
            <span className="t-label link-text">{t("finishSetup")}</span>
          </span>
          <Icon name="forward" size={20} />
        </Link>
      )}

      <WarningsCard />

      <GoalProgress />

      <QuickActions />

      <ClaraOrb />

      <PaycheckCard />

      {income !== null && (
        <section className="card month-card" aria-labelledby="month-title">
          <div className="row row--between">
            <h2 id="month-title" className="t-heading">
              {t("thisMonth")}
            </h2>
            <span className="t-caption muted num">{t("ofIncome", { amount: formatUSD(s.income) })}</span>
          </div>
          {sts && (
            <div className="month-card__left">
              <p className="t-label muted">{t("leftLabel")}</p>
              <p className={negative ? "month-card__figure tone-alerta" : "month-card__figure tone-positive"}>{formatUSD(s.left)}</p>
            </div>
          )}
          {negative && <p className="t-body tone-alerta">{t("leftNegative", { amount: formatUSD(-s.left) })}</p>}
          <div className="breakdown">
            {rows.map((r) => (
              <div key={r.key} className="stack-sm">
                <div className="row row--between">
                  <span className="t-label">{r.label}</span>
                  <span className="t-body num">{formatUSD(r.value)}</span>
                </div>
                <span className={`bar bar--${r.tone}`} role="progressbar" aria-label={r.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, r.value / base) * 100)}>
                  <span style={{ width: `${Math.min(1, r.value / base) * 100}%` }} />
                </span>
              </div>
            ))}
          </div>
          <Explain text={x("whatsLeft")} />
        </section>
      )}

      <SafeToSpendCard details />

      <section className="stack-sm">
        <h2 className="t-heading">{t("upcoming")}</h2>
        <div className="card">
          {upcoming.length === 0 ? (
            <p className="t-body muted">{t("noUpcoming")}</p>
          ) : (
            <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {upcoming.map(({ bill, days }) => (
                <li key={bill.id} className="list-row">
                  <span className={days <= 2 ? "row-icon row-icon--mango" : "row-icon row-icon--clara"} aria-hidden>
                    <Icon name="calendar" size={18} />
                  </span>
                  <div className="grow">
                    <p className="t-body">{bill.name}</p>
                    <p className={days <= 2 ? "t-caption tone-mango" : "t-caption muted"}>{days === 0 ? t("dueToday") : t("dueInDays", { days })}</p>
                  </div>
                  <span className="t-body num">{formatUSD(bill.amount_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {income !== null && (
        <Link href="/app/chequeo" className="card checkup-teaser">
          <span className="row-icon row-icon--mango" aria-hidden>
            <Icon name="heart" size={18} />
          </span>
          <span className="grow stack-sm">
            <span className="t-label">
              {checkup ? ch("teaser", { month: today.toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "long" }) }) : ch("title")}
            </span>
            {checkup && <span className="t-body muted checkup-teaser__text">{checkup.summary_text.split(/\n/)[0]}</span>}
            <span className="t-label checkup-teaser__link">{ch("open")}</span>
          </span>
          <Icon name="forward" size={20} />
        </Link>
      )}

      <HealthCard />

      <PatternsCard />

      <TaxCard />

      <VeteranCard />

      <section className="stack-sm">
        <h2 className="t-heading">{t("recent")}</h2>
        <div className="card">
          {entries.length === 0 ? (
            <div className="stack-sm">
              <p className="t-body muted">{t("noEntries")}</p>
              <Link href="/app/add" className="t-label">
                {t("logSomething")}
              </Link>
            </div>
          ) : (
            <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {entries.slice(0, 5).map((e) => {
                const tone = e.type === "income" ? "positive" : e.type === "send" ? "mango" : e.type === "savings" ? "violet" : "clara";
                const icon = e.type === "income" ? "plus" : e.type === "send" ? "send" : e.type === "savings" ? "target" : e.type === "bill_paid" ? "calendar" : "list";
                return (
                  <li key={e.id} className="list-row">
                    <span className={`row-icon row-icon--${tone}`} aria-hidden>
                      <Icon name={icon} size={18} />
                    </span>
                    <div className="grow">
                      <p className="t-body">{e.note || cat(e.category)}</p>
                      <p className="t-caption muted">
                        {cat(e.category)} · {formatShortDate(e.date, locale)}
                      </p>
                    </div>
                    <span className={e.type === "income" ? "t-body num tone-positive" : "t-body num"}>
                      {e.type === "income" ? "+" : "−"}
                      {formatUSD(e.amount_cents)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="stack-sm">
        <h2 className="t-heading">{t("explore")}</h2>
        <div className="explore-grid">
          <Link href="/aprende" className="explore-tile">
            <span className="row-icon row-icon--clara" aria-hidden>
              <Icon name="info" size={18} />
            </span>
            <span className="t-label">{ac("homeLink")}</span>
          </Link>
          <Link href="/estilo" className="explore-tile">
            <span className="row-icon row-icon--violet" aria-hidden>
              <Icon name="heart" size={18} />
            </span>
            <span className="t-label">{ms("homeLink")}</span>
          </Link>
          <FeedbackButton className="explore-tile">
            <span className="row-icon row-icon--mango" aria-hidden>
              <Icon name="send" size={18} />
            </span>
            <span className="t-label">{fb("homeTile")}</span>
          </FeedbackButton>
          {hasPlus(subscription) && (
            <Link href="/app/pago" className="explore-tile">
              <span className="row-icon row-icon--positive" aria-hidden>
                <Icon name="check" size={18} />
              </span>
              <span className="t-label">{tp("homeLink")}</span>
            </Link>
          )}
        </div>
      </section>

      <InstallCard />
    </main>
  );
}
