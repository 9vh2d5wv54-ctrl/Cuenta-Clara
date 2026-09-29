"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useData } from "./DataProvider";
import { Icon } from "./Icon";
import { businessTotals, type BusinessTotals } from "@/lib/business";
import { todayISO } from "@/lib/dates";
import { formatUSD } from "@/lib/money";

/** Came in · Costs · You kept, side by side. */
export function BizStats({ totals, hideKept }: { totals: BusinessTotals; hideKept?: boolean }) {
  const t = useTranslations("business");
  const lost = totals.profit < 0;
  return (
    <div className="biz-stats">
      <div className="biz-stat">
        <span className="t-caption muted">{t("income")}</span>
        <span className="biz-stat__num num tone-positive">{formatUSD(totals.income)}</span>
      </div>
      <div className="biz-stat">
        <span className="t-caption muted">{t("costs")}</span>
        <span className="biz-stat__num num">{formatUSD(totals.costs)}</span>
      </div>
      {!hideKept && (
        <div className="biz-stat biz-stat--kept">
          <span className="t-caption muted">{lost ? t("loss") : t("profit")}</span>
          <span className={lost ? "biz-stat__num num tone-alerta" : "biz-stat__num num"}>{formatUSD(Math.abs(totals.profit))}</span>
        </div>
      )}
    </div>
  );
}

/** Home: the business this month (Business mode only). */
export function BusinessCard() {
  const t = useTranslations("business");
  const { profile, business } = useData();
  if (!profile?.business_on) return null;
  const month = businessTotals(business, todayISO().slice(0, 7));

  return (
    <section className="card biz-card stack-sm" aria-labelledby="biz-card-title">
      <div className="row row--between">
        <h2 id="biz-card-title" className="t-label biz-card__title">
          <span className="row-icon row-icon--positive" aria-hidden>
            <Icon name="briefcase" size={16} />
          </span>
          {t("cardTitle")}
        </h2>
        <Link href="/app/negocio" className="t-label biz-card__link">
          {t("seeAll")}
        </Link>
      </div>
      {month.count === 0 ? (
        <>
          <p className="t-body muted">{t("empty")}</p>
          <LogButtons />
        </>
      ) : (
        <BizStats totals={month} />
      )}
    </section>
  );
}

/** Quick links into Log with the business switch already on. */
export function LogButtons() {
  const t = useTranslations("business");
  return (
    <div className="biz-actions">
      <Link href="/app/add?business=1&type=income" className="btn btn--secondary">
        <Icon name="plus" size={18} />
        {t("logIncome")}
      </Link>
      <Link href="/app/add?business=1&type=expense" className="btn btn--secondary">
        <Icon name="list" size={18} />
        {t("logCost")}
      </Link>
    </div>
  );
}
