"use client";

import { useTranslations } from "next-intl";
import type { PremiumFeature } from "@/lib/plan";
import { usePremium } from "./Premium";
import { Button, Card } from "./ui";

/** Shown in place of a form the free plan doesn't cover. */
export function PremiumCard({ feature }: { feature: PremiumFeature }) {
  const t = useTranslations("premium");
  const { openPremium } = usePremium();
  const title = feature === "goals" ? t("titleGoals") : feature === "countries" ? t("titleCountries") : t("titleExport");
  return (
    <Card tone="clara">
      <div className="stack-sm">
        <span className="premium-badge t-caption">{t("badge")}</span>
        <p className="t-heading">{title}</p>
        <p className="t-body muted">{t("lead")}</p>
        <Button variant="secondary" onClick={() => openPremium(feature)}>
          {t("upgrade")}
        </Button>
      </div>
    </Card>
  );
}
