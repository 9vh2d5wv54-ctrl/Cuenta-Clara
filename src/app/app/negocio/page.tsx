"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { BizStats, LogButtons } from "@/components/Business";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/components/Icon";
import { OrbMark } from "@/components/ClaraCard";
import { Explain } from "@/components/ui";
import { businessTotals, costsByCategory, taxOnProfit } from "@/lib/business";
import { formatShortDate, todayISO } from "@/lib/dates";
import { formatUSD } from "@/lib/money";

const SHOW = 20;

// Business mode: this month and this year for a side hustle, gig work or
// self-employed pay. Income, costs, what they kept, costs by category and the
// tax set-aside on profit. A planning summary, not bookkeeping.
export default function BusinessPage() {
  const t = useTranslations("business");
  const cat = useTranslations("add.categories");
  const locale = useLocale();
  const { profile, business, taxPct } = useData();
  const today = todayISO();
  const year = today.slice(0, 4);
  const month = businessTotals(business, today.slice(0, 7));
  const ytd = businessTotals(business, year);
  const byCat = costsByCategory(business, year);
  const maxCat = byCat[0]?.cents ?? 1;

  return (
    <main className="page">
      <header className="stack-sm">
        <h1 className="t-title">{t("title")}</h1>
        <p className="t-body muted">{t("lead")}</p>
      </header>

      {!profile?.business_on && business.length === 0 ? (
        <section className="card stack-sm">
          <p className="t-body">{t("settingHelp")}</p>
          <Link href="/app/ajustes" className="btn btn--primary btn--block">
            {t("settingTitle")}
          </Link>
        </section>
      ) : (
        <>
          <section className="hero-card biz-hero stack-sm" aria-labelledby="biz-year">
            <span className="hero-card__sparkles" aria-hidden />
            <p id="biz-year" className="t-label">
              {t("thisYear")} · {year}
            </p>
            <p className="biz-hero__big num">{formatUSD(Math.abs(ytd.profit))}</p>
            <p className="t-caption">{ytd.profit < 0 ? t("loss") : t("profit")}</p>
            <BizStats totals={ytd} hideKept />
          </section>

          <section className="card stack-sm" aria-labelledby="biz-month">
            <h2 id="biz-month" className="t-label">
              {t("thisMonth")}
            </h2>
            {month.count === 0 ? <p className="t-body muted">{t("empty")}</p> : <BizStats totals={month} />}
            <Explain text={t("explain")} />
          </section>

          <LogButtons />

          <section className="card stack-sm" aria-labelledby="biz-tax">
            <h2 id="biz-tax" className="t-label biz-card__title">
              <span className="row-icon row-icon--mango" aria-hidden>
                <Icon name="shield" size={16} />
              </span>
              {t("taxTitle")}
            </h2>
            {taxPct > 0 ? (
              ytd.profit > 0 ? (
                <p className="t-body">{t("taxOn", { pct: taxPct, amount: formatUSD(taxOnProfit(ytd.profit, taxPct)) })}</p>
              ) : (
                <p className="t-body muted">{t("taxNothing")}</p>
              )
            ) : (
              <p className="t-body muted">{t("taxOff")}</p>
            )}
            <p className="t-caption muted">{t("taxNote")}</p>
          </section>

          <section className="card stack-sm" aria-labelledby="biz-cats">
            <h2 id="biz-cats" className="t-label">
              {t("byCategory")}
            </h2>
            {byCat.length === 0 ? (
              <p className="t-body muted">{t("noCosts")}</p>
            ) : (
              <div className="breakdown">
                {byCat.map((c) => (
                  <div key={c.category} className="stack-sm">
                    <div className="row row--between">
                      <span className="t-label">{cat(c.category)}</span>
                      <span className="t-body num">{formatUSD(c.cents)}</span>
                    </div>
                    <span className="bar bar--clara" aria-hidden>
                      <span style={{ width: `${(c.cents / maxCat) * 100}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Link href={`/app/clara?q=${encodeURIComponent(t("askQ"))}`} className="card biz-ask">
            <OrbMark size="sm" />
            <span className="t-label grow">{t("ask")}</span>
            <Icon name="forward" size={20} />
          </Link>

          {business.length > 0 && (
            <section className="stack-sm" aria-labelledby="biz-entries">
              <h2 id="biz-entries" className="t-heading">
                {t("entries")}
              </h2>
              <div className="card">
                <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {business.slice(0, SHOW).map((e) => (
                    <li key={e.id} className="list-row">
                      <span className={`row-icon row-icon--${e.type === "income" ? "positive" : "clara"}`} aria-hidden>
                        <Icon name={e.type === "income" ? "plus" : "list"} size={18} />
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
                  ))}
                </ul>
              </div>
              {business.length > SHOW && <p className="t-caption muted">{t("more", { shown: SHOW, total: business.length })}</p>}
            </section>
          )}

          <p className="t-caption muted">{t("keepReceipts")}</p>
        </>
      )}
    </main>
  );
}
