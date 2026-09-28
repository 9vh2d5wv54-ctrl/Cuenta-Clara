"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Card } from "@/components/ui";
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
        <Link href="/app/veteranos" className="t-label">
          ← {v("title")}
        </Link>
        <h1 className="t-title">{t("title")}</h1>
        <p className="t-body muted">{t("lead")}</p>
        <p className="t-label">{t("progress", { done, total: BENEFITS.length })}</p>
      </div>

      {BENEFIT_GROUPS.map((group) => (
        <section key={group} className="stack-sm">
          <h2 className="t-heading">{t(`group_${group}`)}</h2>
          {BENEFITS.filter((b) => b.group === group).map((b) => (
            <Card key={b.id} tone={checked.includes(b.id) ? "clara" : undefined}>
              <div className="stack-sm">
                <label className="row" style={{ cursor: "pointer", alignItems: "flex-start" }}>
                  <input type="checkbox" checked={checked.includes(b.id)} onChange={() => toggle(b.id)} style={{ marginTop: 4 }} />
                  <span className="t-label grow">{t(`${b.id}_title`)}</span>
                </label>
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
            </Card>
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
