"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useData } from "@/components/DataProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Card, Explain, ProgressBar } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { summarize } from "@/lib/budget";
import { daysBetween, formatShortDate, nextDueDate } from "@/lib/dates";
import { formatUSD } from "@/lib/money";
import { setupSeen } from "@/lib/setup-prompt";

export default function Dashboard() {
  const t = useTranslations("dashboard");
  const x = useTranslations("explain");
  const cat = useTranslations("add.categories");
  const locale = useLocale();
  const ch = useTranslations("checkup");
  const { income, bills, recipients, goals, entries, checkup, profile } = useData();
  const router = useRouter();

  // A brand-new account with nothing entered goes straight to setup, once.
  const brandNew = income === null && bills.length === 0 && recipients.length === 0 && goals.length === 0;
  useEffect(() => {
    if (brandNew && profile && !setupSeen(profile.id)) router.replace("/app/setup");
  }, [brandNew, profile, router]);

  const s = summarize(income ?? 0, bills, recipients, goals, entries);
  const base = Math.max(s.income, 1);
  const negative = s.left < 0;

  const today = new Date();
  const upcoming = bills
    .map((b) => ({ bill: b, days: daysBetween(today, nextDueDate(b.due_day, today)) }))
    .filter((u) => u.days <= 7)
    .sort((a, b) => a.days - b.days);

  const monthName = today.toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "long", year: "numeric" });
  const month = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const rows = [
    { key: "bills", label: t("bills"), value: s.bills, tone: "clara" as const, explain: x("bills") },
    { key: "family", label: t("family"), value: s.family, tone: "mango" as const, explain: x("family") },
    { key: "savings", label: t("savings"), value: s.savings, tone: "clara" as const, explain: x("savings") },
    { key: "spending", label: t("spending"), value: s.spending, tone: "clara" as const, explain: x("spending") },
  ];

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="t-caption muted">
            {month}
          </p>
          <h1 className="t-title">{t("greeting")}</h1>
        </div>
        <LanguageToggle />
      </header>

      {(income === null || bills.length === 0) && (
        <div className="notice">
          <Icon name="info" />
          <div className="stack-sm grow">
            <p className="t-body">{income === null ? t("nudgeIncome") : t("nudgeBill")}</p>
            <Link href="/app/setup" className="t-label">
              {t("finishSetup")}
            </Link>
          </div>
        </div>
      )}

      <Card className="hero">
        <div className="row" style={{ justifyContent: "center" }}>
          <p className="t-label muted">{t("leftLabel")}</p>
        </div>
        <p className={negative ? "t-money-xl hero__figure hero__figure--negative" : "t-money-xl hero__figure"}>
          {formatUSD(s.left)}
        </p>
        <p className="t-body">
          {negative
            ? t("leftNegative", { amount: formatUSD(-s.left) })
            : t("leftPositive", { amount: formatUSD(s.left) })}
        </p>
        {income !== null && (
          <p className="t-caption muted num">{t("ofIncome", { amount: formatUSD(s.income) })}</p>
        )}
        <Explain text={x("whatsLeft")} />
      </Card>

      {income !== null && (
        <Link href="/app/chequeo" className="card card--mango checkup-teaser">
          <span className="checkup-teaser__icon" aria-hidden>
            <Icon name="heart" />
          </span>
          <span className="grow stack-sm">
            <span className="t-label">
              {checkup ? ch("teaser", { month: today.toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "long" }) }) : ch("title")}
            </span>
            {checkup && (
              <span className="t-body checkup-teaser__text">{checkup.summary_text.split(/\n/)[0]}</span>
            )}
            <span className="t-label checkup-teaser__link">{ch("open")}</span>
          </span>
        </Link>
      )}

      <Card>
        <div className="breakdown">
          {rows.map((r) => (
            <div key={r.key} className="stack-sm">
              <div className="row row--between">
                <span className="t-label">{r.label}</span>
                <span className="t-body num">{formatUSD(r.value)}</span>
              </div>
              <ProgressBar value={r.value / base} tone={r.tone} label={r.label} />
            </div>
          ))}
        </div>
      </Card>

      <section className="stack-sm">
        <h2 className="t-heading">{t("upcoming")}</h2>
        <Card>
          {upcoming.length === 0 ? (
            <p className="t-body muted">{t("noUpcoming")}</p>
          ) : (
            <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {upcoming.map(({ bill, days }) => (
                <li key={bill.id} className="list-row">
                  <Icon name="calendar" />
                  <div className="grow">
                    <p className="t-body">{bill.name}</p>
                    <p className="t-caption muted">{days === 0 ? t("dueToday") : t("dueInDays", { days })}</p>
                  </div>
                  <span className="t-body num">{formatUSD(bill.amount_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="stack-sm">
        <h2 className="t-heading">{t("recent")}</h2>
        <Card>
          {entries.length === 0 ? (
            <div className="stack-sm">
              <p className="t-body muted">{t("noEntries")}</p>
              <Link href="/app/add" className="t-label">
                {t("logSomething")}
              </Link>
            </div>
          ) : (
            <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {entries.slice(0, 5).map((e) => (
                <li key={e.id} className="list-row">
                  <span
                    className="dot"
                    style={{ background: e.type === "send" ? "var(--mango)" : "var(--clara)" }}
                  />
                  <div className="grow">
                    <p className="t-body">{e.note || cat(e.category)}</p>
                    <p className="t-caption muted">{cat(e.category)} · {formatShortDate(e.date, locale)}</p>
                  </div>
                  <span className="t-body num">{formatUSD(e.amount_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </main>
  );
}
