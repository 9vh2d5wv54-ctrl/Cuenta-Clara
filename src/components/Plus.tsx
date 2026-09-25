"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { hadTrial, type PlusFeature } from "@/lib/plan";
import { useData } from "./DataProvider";
import { Card } from "./ui";

export function paywallHref(feature?: PlusFeature) {
  return feature ? `/app/plus?f=${feature}` : "/app/plus";
}

/** Small upsell where the free plan stops. Hidden until the first checkup (PRD paywall rule). */
export function PlusCard({ feature, title }: { feature: PlusFeature; title: string }) {
  const t = useTranslations("plus");
  const { hasCheckup, subscription } = useData();
  if (!hasCheckup) return null;
  return (
    <Card tone="clara">
      <div className="stack-sm">
        <span className="plus-badge t-caption">{t("badge")}</span>
        <p className="t-heading">{title}</p>
        <p className="t-body muted">{t("lead")}</p>
        <Link href={paywallHref(feature)} className="btn btn--secondary">
          {hadTrial(subscription) ? t("see") : t("trialButton")}
        </Link>
      </div>
    </Card>
  );
}

/**
 * A Plus extra shown blurred behind a trial button. Only for previews built from
 * sample or the person's own projected numbers; never hides their actual budget.
 */
export function PlusPreview({ feature, label, children }: { feature: PlusFeature; label: string; children: ReactNode }) {
  const t = useTranslations("plus");
  const { hasCheckup, subscription } = useData();
  return (
    <div className="plus-preview">
      <div className="plus-preview__content" aria-hidden inert>
        {children}
      </div>
      <div className="plus-preview__overlay">
        <span className="plus-badge t-caption">{t("badge")}</span>
        <p className="t-heading">{label}</p>
        {hasCheckup && (
          <Link href={paywallHref(feature)} className="btn btn--primary">
            {hadTrial(subscription) ? t("see") : t("trialButton")}
          </Link>
        )}
      </div>
    </div>
  );
}
