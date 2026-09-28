"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useData } from "./DataProvider";
import { Icon } from "./Icon";
import { Card, Explain } from "./ui";
import { formatShortDate } from "@/lib/dates";
import { formatUSD } from "@/lib/money";
import { currentPayPeriod } from "@/lib/paycheck";
import { hasPlus } from "@/lib/plan";

/** Paycheck mode (Plus): what you can spend until the next payday. */
export function PaycheckCard() {
  const t = useTranslations("paycheck");
  const locale = useLocale();
  const { profile, subscription, recent, bills, recipients, goals, taxPct } = useData();
  const frequency = profile?.pay_frequency;
  if (!frequency || !hasPlus(subscription)) return null;

  const period = currentPayPeriod(frequency, recent, bills, recipients, goals, undefined, taxPct);
  const gotPaid = (
    <Link href="/app/add?type=income" className="btn btn--primary btn--block">
      <Icon name="plus" size={20} />
      {t("gotPaid")}
    </Link>
  );

  if (!period) {
    return (
      <Card className="hero">
        <p className="t-body">{t("empty")}</p>
        {gotPaid}
      </Card>
    );
  }

  const negative = period.left < 0;
  const lines = [
    { key: "bills", label: t("bills"), value: period.bills },
    { key: "family", label: t("family"), value: period.family },
    { key: "savings", label: t("savings"), value: period.savings },
    { key: "taxes", label: t("taxes"), value: period.taxes },
    { key: "spent", label: t("spent"), value: period.spent },
  ].filter((l) => l.value > 0);

  return (
    <Card className="hero">
      <div className="row" style={{ justifyContent: "center" }}>
        <p className="t-label muted">
          {t("leftLabel")} · {t("untilDate", { date: formatShortDate(period.nextPayday, locale) })}
        </p>
      </div>
      <p className={negative ? "t-money-xl hero__figure hero__figure--negative" : "t-money-xl hero__figure"}>
        {formatUSD(period.left)}
      </p>
      {period.daysLeft <= 0 ? (
        <p className="t-body">{t("paydayCame", { date: formatShortDate(period.nextPayday, locale) })}</p>
      ) : negative ? (
        <p className="t-body">{t("overspent", { amount: formatUSD(-period.left) })}</p>
      ) : (
        period.perDay !== null && (
          <p className="t-body">{t("perDay", { amount: formatUSD(period.perDay), days: period.daysLeft })}</p>
        )
      )}

      {period.short > 0 && (
        <p className="notice notice--alerta t-caption" role="alert">
          {t("short", { amount: formatUSD(period.short) })}
        </p>
      )}

      <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0, textAlign: "start" }}>
        <li className="list-row">
          <span className="t-body grow">{t("paid")}</span>
          <span className="t-body num">{formatUSD(period.paid)}</span>
        </li>
        {lines.map((l) => (
          <li key={l.key} className="list-row">
            <span className="grow">
              <span className="t-body">{l.label}</span>
              {l.key === "bills" && period.billsDue.length > 0 && (
                <span className="t-caption muted" style={{ display: "block" }}>
                  {t("dueSoon", {
                    list: period.billsDue.map((b) => `${b.bill.name} (${formatShortDate(b.date, locale)})`).join(", "),
                  })}
                </span>
              )}
            </span>
            <span className="t-body num">−{formatUSD(l.value)}</span>
          </li>
        ))}
      </ul>

      <Explain text={t("explain")} />
      {gotPaid}
    </Card>
  );
}
