"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Card } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { VetNav } from "@/components/VetNav";
import { BENEFIT_GROUPS, BENEFITS, loadChecked, saveChecked } from "@/lib/vet-benefits";

const CRISIS_LINE = "https://www.veteranscrisisline.net/";
const VA_REPRESENTATIVE = "https://www.va.gov/get-help-from-accredited-representative/";

// Veterans track (free): benefits veterans often miss, with official links.
export default function VetBenefits() {
  const t = useTranslations("vetBenefits");
  const v = useTranslations("veterans");
  const { profile } = useData();
  const userId = profile?.id ?? "guest";
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => setChecked(loadChecked(userId)), [userId]);

  function toggle(id: string) {
    const next = checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id];
    setChecked(next);
    saveChecked(userId, next);
  }

  const done = BENEFITS.filter((b) => checked.includes(b.id)).length;

  return (
    <main className="page">
      <div className="stack-sm">
        <h1 className="t-title">{t("title")}</h1>
        <p className="t-body muted">{t("lead")}</p>
      </div>

      <VetNav />

      <section className="card stack-sm benefit-progress">
        <div className="row row--between">
          <p className="t-label">{t("progress", { done, total: BENEFITS.length })}</p>
          <p className="t-label num tone-positive">{Math.round((done / BENEFITS.length) * 100)}%</p>
        </div>
        <span className="bar bar--positive" role="progressbar" aria-label={t("progress", { done, total: BENEFITS.length })} aria-valuemin={0} aria-valuemax={BENEFITS.length} aria-valuenow={done}>
          <span style={{ width: `${(done / BENEFITS.length) * 100}%` }} />
        </span>
      </section>

      {BENEFIT_GROUPS.map((group) => (
        <section key={group} className="stack-sm">
          <h2 className="t-heading">{t(`group_${group}`)}</h2>
          {BENEFITS.filter((b) => b.group === group).map((b) => (
            <article key={b.id} className={checked.includes(b.id) ? "card benefit benefit--done" : "card benefit"}>
              <button
                type="button"
                className="benefit__check"
                role="checkbox"
                aria-checked={checked.includes(b.id)}
                aria-labelledby={`benefit-${b.id}`}
                onClick={() => toggle(b.id)}
              >
                <Icon name="check" size={18} />
              </button>
              <div className="stack-sm grow">
                <h3 id={`benefit-${b.id}`} className="t-label">
                  {t(`${b.id}_title`)}
                </h3>
                <p className="t-body muted">{t(`${b.id}_text`)}</p>
                <div className="row" style={{ flexWrap: "wrap", gap: 16 }}>
                  <a href={b.url} target="_blank" rel="noreferrer" className="t-label">
                    {t("official")} ↗
                  </a>
                  {b.inApp && (
                    <Link href={b.inApp} className="t-label">
                      {t(`${b.id}_inApp`)} →
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      ))}

      <Card>
        <div className="stack-sm">
          <p className="t-label">{t("crisisTitle")}</p>
          <p className="t-body">{t("crisis")}</p>
          <a href={CRISIS_LINE} target="_blank" rel="noreferrer" className="t-label">
            veteranscrisisline.net ↗
          </a>
        </div>
      </Card>

      <p className="t-body">
        {v("help")}{" "}
        <a href={VA_REPRESENTATIVE} target="_blank" rel="noreferrer">
          {v("helpLink")}
        </a>
      </p>
      <p className="t-caption muted">{t("saved")}</p>
      <p className="t-caption muted">{t("notVa")}</p>
    </main>
  );
}
