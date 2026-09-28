"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Card, Field, Input, MoneyInput, Segmented } from "@/components/ui";
import { formatLongDate } from "@/lib/dates";
import { giPlan, GI_RATES, tierFor, type School } from "@/lib/gi-bill";
import { formatUSD, parseCents } from "@/lib/money";

const VA_RATES_URL = "https://www.va.gov/education/benefit-rates/post-9-11-gi-bill-rates/";
const VA_COMPARE_URL = "https://www.va.gov/education/gi-bill-comparison-tool/";

// Veterans track (free): Post-9/11 GI Bill estimate. VA decides actual benefits.
export default function GiBillPlanner() {
  const t = useTranslations("giBill");
  const v = useTranslations("veterans");
  const locale = useLocale();
  const [days, setDays] = useState("1095");
  const [special, setSpecial] = useState(false);
  const [activeDuty, setActiveDuty] = useState(false);
  const [school, setSchool] = useState<School>("public");
  const [tuition, setTuition] = useState("");
  const [bah, setBah] = useState("");

  const pct = tierFor(Math.max(0, Math.floor(Number(days) || 0)), special);
  const plan = giPlan({ pct, school, tuition: parseCents(tuition) ?? 0, bah: parseCents(bah) ?? 0, activeDuty });

  return (
    <main className="page">
      <div className="stack-sm">
        <Link href="/app/veteranos" className="t-label">
          ← {v("title")}
        </Link>
        <h1 className="t-title">{t("title")}</h1>
        <p className="t-body muted">{t("lead")}</p>
      </div>

      <Card>
        <div className="stack">
          <Field label={t("days")} hint={t("daysHint")}>
            {(p) => <Input {...p} type="number" inputMode="numeric" min={0} value={days} onChange={(e) => setDays(e.target.value)} />}
          </Field>
          <label className="row t-caption" style={{ cursor: "pointer", alignItems: "flex-start" }}>
            <input type="checkbox" checked={special} onChange={(e) => setSpecial(e.target.checked)} />
            {t("special")}
          </label>
          <label className="row t-caption" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={activeDuty} onChange={(e) => setActiveDuty(e.target.checked)} />
            {t("activeDuty")}
          </label>
          <div className="field">
            <span className="field__label">{t("school")}</span>
            <Segmented
              label={t("school")}
              value={school}
              onChange={setSchool}
              options={[
                { value: "public", label: t("public") },
                { value: "private", label: t("private") },
                { value: "flight", label: t("flight") },
                { value: "correspondence", label: t("correspondence") },
              ]}
            />
          </div>
          <Field label={t("tuition")}>
            {(p) => <MoneyInput {...p} value={tuition} onChange={(e) => setTuition(e.target.value)} />}
          </Field>
          {(school === "public" || school === "private") && (
            <Field label={t("bah")} hint={t("bahHint")}>
              {(p) => <MoneyInput {...p} value={bah} onChange={(e) => setBah(e.target.value)} />}
            </Field>
          )}
          <a href={VA_COMPARE_URL} target="_blank" rel="noreferrer" className="t-label">
            {t("toolLink")}
          </a>
        </div>
      </Card>

      <Card className="hero">
        {pct === 0 ? (
          <p className="t-body">{t("notEligible")}</p>
        ) : (
          <>
            <p className="t-label muted">{t("tier", { pct })}</p>
            <p className="t-money-xl hero__figure">{pct}%</p>
            {plan.tuitionCovered > 0 && <p className="t-body">{t("covered", { amount: formatUSD(plan.tuitionCovered) })}</p>}
            {plan.outOfPocket > 0 && <p className="t-body">{t("out", { amount: formatUSD(plan.outOfPocket) })}</p>}
            {plan.housingMonthly !== null ? (
              <p className="t-body">{t("housing", { amount: formatUSD(plan.housingMonthly) })}</p>
            ) : activeDuty ? (
              <p className="t-caption muted">{t("noHousing")}</p>
            ) : (
              (school === "flight" || school === "correspondence") && <p className="t-caption muted">{t("noHousingSchool")}</p>
            )}
            {school !== "public" && (
              <p className="t-caption muted">
                {t("cap", {
                  cap: formatUSD(school === "private" ? GI_RATES.privateCap : school === "flight" ? GI_RATES.flightCap : GI_RATES.correspondenceCap),
                })}
              </p>
            )}
          </>
        )}
      </Card>

      <p className="t-caption muted">
        {t("booksPending")}{" "}
        <a href={VA_RATES_URL} target="_blank" rel="noreferrer">
          {t("ratesLink")}
        </a>
      </p>
      <p className="t-caption muted">
        {t("rules", { from: formatLongDate(GI_RATES.effective, locale), to: formatLongDate(GI_RATES.through, locale) })}
      </p>
    </main>
  );
}
