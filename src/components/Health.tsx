"use client";

import { localizeDollars } from "@/lib/money";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useData } from "./DataProvider";
import { Card, Explain, ProgressBar } from "./ui";
import { healthScore, PART_POINTS, type Part } from "@/lib/health";

const LINKS: Record<Part, string> = {
  emergency: "/app/metas",
  debt: "/app/deudas",
  savings: "/app/metas",
  room: "/aprende/presupuesto",
};

/** Money Health Score (free): four parts, one next step. */
export function HealthCard() {
  const t = useTranslations("health");
  const { income, bills, recipients, goals, debts, entries, profile, taxPct } = useData();
  if (income === null) return null;
  const h = healthScore({ income, bills, recipients, goals, debts, monthEntries: entries, buffer: profile?.buffer_cents ?? 0, taxPct });
  if (!h) return null;

  const band = h.score >= 70 ? "high" : h.score >= 40 ? "mid" : "low";
  const pct = (v: number) => Math.round(v * 100);
  const valueLine = (part: Part, value: number) =>
    part === "emergency"
      ? t("emergencyValue", { months: Math.round(value * 10) / 10 })
      : t(`${part}Value`, { pct: Math.max(0, pct(value)) });

  return (
    <Card>
      <div className="stack">
        <div className="row row--between">
          <p className="t-heading">{t("title")}</p>
          <Explain text={t("explain")} align="end" />
        </div>
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <span className="t-money-xl num">{h.score}</span>
          <span className="t-caption muted">{t("outOf")}</span>
          <span className={band === "low" ? "t-label hero__figure--negative" : "t-label"} style={{ marginInlineStart: "auto" }}>
            {t(band)}
          </span>
        </div>
        <div className="breakdown">
          {h.parts.map((p) => (
            <div key={p.part} className="stack-sm">
              <div className="row row--between">
                <span className="t-label">{t(p.part)}</span>
                <span className="t-caption num">
                  {p.points}/{PART_POINTS}
                </span>
              </div>
              <ProgressBar value={p.points / PART_POINTS} tone={p.points < 10 ? "alerta" : "clara"} label={t(p.part)} />
              <span className="t-caption muted">{valueLine(p.part, p.value)}</span>
            </div>
          ))}
        </div>
        {h.score < 100 && (
          <div className="notice">
            <div className="stack-sm grow">
              <p className="t-label">{t("next")}</p>
              <p className="t-body">{localizeDollars(t(`tip_${h.weakest}`))}</p>
              <Link href={LINKS[h.weakest]} className="t-label">
                {t(`link_${h.weakest}`)}
              </Link>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
