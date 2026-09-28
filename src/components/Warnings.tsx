"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useData } from "./DataProvider";
import { Icon } from "./Icon";
import { Card } from "./ui";
import { formatUSD } from "@/lib/money";
import { warnings, type Warning } from "@/lib/warnings";

const LINKS: Record<Warning["kind"], string> = {
  pace: "/app",
  rising: "/app/add",
  interest: "/app/deudas",
  impulse: "/aprende/presupuesto",
  fees: "/aprende/presupuesto",
};

/** Smart warnings (free): up to three heads-ups from the person's own numbers. */
export function WarningsCard() {
  const t = useTranslations("warnings");
  const cat = useTranslations("add.categories");
  const { income, bills, recipients, goals, debts, entries, recent, taxPct } = useData();
  const list = warnings({ income: income ?? 0, bills, recipients, goals, debts, monthEntries: entries, recent, taxPct });
  if (list.length === 0) return null;

  const text = (w: Warning) => {
    switch (w.kind) {
      case "pace":
        return t("pace", { amount: formatUSD(w.short) });
      case "rising":
        return t("rising", { category: cat(w.category), now: formatUSD(w.now), more: formatUSD(w.more) });
      case "interest":
        return t("interest", { name: w.name, apr: w.apr, amount: formatUSD(w.monthly) });
      case "impulse":
        return t("impulse", { count: w.count, category: cat(w.category), total: formatUSD(w.total) });
      case "fees":
        return t("fees", { count: w.count, total: formatUSD(w.total) });
    }
  };

  return (
    <Card tone="mango">
      <div className="stack-sm">
        <p className="t-heading">{t("title")}</p>
        <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {list.map((w) => (
            <li key={w.kind} className="list-row" style={{ alignItems: "flex-start" }}>
              <Icon name="alert" size={20} />
              <div className="grow stack-sm">
                <p className="t-body">{text(w)}</p>
                <Link href={LINKS[w.kind]} className="t-label">
                  {t(`${w.kind}Link`)}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
