"use client";

import { useLocale, useTranslations } from "next-intl";
import { forecast, monthName } from "@/lib/forecast";
import { formatUSD } from "@/lib/money";
import { useData } from "./DataProvider";

/** Plus: next 3 months at this month's pace. Three rows, so a small table, not a chart. */
export function Forecast() {
  const t = useTranslations("forecast");
  const locale = useLocale();
  const { income, bills, recipients, goals, entries } = useData();
  const rows = forecast(income ?? 0, bills, recipients, goals, entries);
  const last = rows[rows.length - 1];

  return (
    <div className="stack-sm">
      <h2 className="t-heading">{t("title", { month: monthName(last.month, locale) })}</h2>
      <p className="t-body muted">{t("lead")}</p>
      <table className="forecast">
        <thead>
          <tr>
            <th scope="col">{t("colMonth")}</th>
            <th scope="col">{t("colLeft")}</th>
            <th scope="col">{t("colGoals")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <th scope="row" className="forecast__month">
                {monthName(r.month, locale)}
              </th>
              <td className={r.left < 0 ? "num forecast__neg" : "num"}>{formatUSD(r.left)}</td>
              <td className="num">{formatUSD(r.savedTowardGoals)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {goals.length > 0 && (
        <p className="t-body">
          {t("total", { month: monthName(last.month, locale), saved: formatUSD(last.savedTowardGoals) })}
        </p>
      )}
      <p className="t-caption muted">{t("note")}</p>
    </div>
  );
}
