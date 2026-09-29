"use client";

import { useLocale, useTranslations } from "next-intl";
import { useData } from "./DataProvider";
import { Icon } from "./Icon";
import { Card, Explain } from "./ui";
import { daysBetween, formatLongDate, formatShortDate } from "@/lib/dates";
import { appCurrency, formatUSD } from "@/lib/money";
import { estimatedTaxPeriod, setAsideThisPeriod } from "@/lib/taxes";

/** Tax set-aside (Plus): what's set aside this IRS period and when the next payment is due. */
export function TaxCard() {
  const t = useTranslations("taxes");
  const us = appCurrency() === "USD";
  const locale = useLocale();
  const { taxPct, profile, recent, income } = useData();
  if (!taxPct) return null;

  const today = new Date();
  const period = estimatedTaxPeriod(today);
  const amount = setAsideThisPeriod(
    taxPct,
    { payMode: Boolean(profile?.pay_frequency), recent, monthlyIncome: income ?? 0 },
    today,
  );
  const [y, m, d] = period.due.split("-").map(Number);
  const days = daysBetween(today, new Date(y, m - 1, d));

  return (
    <Card>
      <div className="stack-sm">
        <div className="row row--between">
          <p className="t-label">{t("cardTitle", { pct: taxPct })}</p>
          <Icon name="calendar" size={20} />
        </div>
        <p className="t-body">
          {t("setAside", { amount: formatUSD(amount), start: formatShortDate(period.start, locale) })}
        </p>
        {/* IRS due dates only apply to U.S. accounts. */}
        {us && (
          <p className="t-caption muted">
            {days <= 14
              ? t("dueSoon", { date: formatLongDate(period.due, locale), days })
              : t("nextDue", { date: formatLongDate(period.due, locale) })}
          </p>
        )}
        <Explain text={us ? t("explain", { pct: taxPct }) : t("explainIntl", { pct: taxPct })} />
      </div>
    </Card>
  );
}
