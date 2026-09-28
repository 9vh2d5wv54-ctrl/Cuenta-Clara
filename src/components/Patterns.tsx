"use client";

import { useLocale, useTranslations } from "next-intl";
import { useData } from "./DataProvider";
import { PlusPreview } from "./Plus";
import { Card } from "./ui";
import { hasPlus } from "@/lib/plan";
import { spendingPatterns, type Pattern } from "@/lib/patterns";

function weekdayName(weekday: number, locale: string): string {
  // 2023-01-01 was a Sunday.
  return new Date(2023, 0, 1 + weekday).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { weekday: "long" });
}

/** Spending patterns (Plus): shown once there's enough logged; free sees their own patterns blurred. */
export function PatternsCard() {
  const t = useTranslations("patterns");
  const cat = useTranslations("add.categories");
  const locale = useLocale();
  const { recent, subscription } = useData();
  const list = spendingPatterns(recent);
  if (list.length === 0) return null;

  const pct = (v: number) => Math.round(v * 100);
  const text = (p: Pattern) => {
    switch (p.kind) {
      case "topDay":
        return t("topDay", { day: weekdayName(p.weekday, locale), pct: pct(p.share) });
      case "weekend":
        return t("weekend", { pct: pct(p.more) });
      case "afterPayday":
        return t("afterPayday", { pct: pct(p.more) });
      case "topCategory":
        return t("topCategory", { category: cat(p.category), pct: pct(p.share) });
    }
  };

  const body = (
    <div className="stack-sm">
      <p className="t-heading">{t("title")}</p>
      <p className="t-caption muted">{t("lead")}</p>
      <ul className="t-body stack-sm" style={{ margin: 0, paddingInlineStart: 20 }}>
        {list.map((p) => (
          <li key={p.kind}>{text(p)}</li>
        ))}
      </ul>
      <p className="t-caption muted">{t("tip")}</p>
    </div>
  );

  return <Card>{hasPlus(subscription) ? body : <PlusPreview feature="patterns" label={t("plusLabel")}>{body}</PlusPreview>}</Card>;
}
