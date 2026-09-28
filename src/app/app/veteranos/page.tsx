"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Button, Card, Field, Input, Segmented, Select } from "@/components/ui";
import { formatLongDate } from "@/lib/dates";
import { formatUSD } from "@/lib/money";
import { combinedRating, RATING_STEPS, type Rating } from "@/lib/va";
import { monthlyCompensation, VA_RATES, type Dependents } from "@/lib/va-rates";

const VA_RATE_TABLE = "https://www.va.gov/disability/compensation-rates/veteran-rates/";
const VA_REPRESENTATIVE = "https://www.va.gov/get-help-from-accredited-representative/";

// Veterans track (free): combined disability rating the way VA calculates it.
// Estimates only; never presented as the VA.
export default function Veteranos() {
  const t = useTranslations("veterans");
  const g = useTranslations("giBill");
  const locale = useLocale();
  const [ratings, setRatings] = useState<Rating[]>([{ percent: 0, bilateral: false }]);
  const [family, setFamily] = useState<Dependents>({
    spouse: false,
    spouseAidAttendance: false,
    parents: 0,
    childrenUnder18: 0,
    schoolChildren: 0,
  });
  const count = (v: string) => Math.max(0, Math.min(20, Math.floor(Number(v) || 0)));

  const set = (i: number, r: Partial<Rating>) => setRatings(ratings.map((x, j) => (j === i ? { ...x, ...r } : x)));
  const filled = ratings.filter((r) => r.percent > 0);
  const result = combinedRating(filled);
  const sum = filled.reduce((s, r) => s + r.percent, 0);
  const monthly = monthlyCompensation(result.rating, family);

  return (
    <main className="page">
      <div className="stack-sm">
        <h1 className="t-title">{t("title")}</h1>
        <p className="t-body muted">{t("lead")}</p>
      </div>

      <Link href="/app/veteranos/gi-bill" className="card row" style={{ textDecoration: "none" }}>
        <Icon name="target" />
        <span className="t-label grow">{g("vaLink")}</span>
        <Icon name="forward" size={20} />
      </Link>

      <Card>
        <div className="stack">
          {ratings.map((r, i) => (
            <div key={i} className="stack-sm">
              <div className="row" style={{ alignItems: "flex-end" }}>
                <div className="grow">
                  <Field label={`${t("rating")} ${i + 1}`}>
                    {(p) => (
                      <Select {...p} value={r.percent} onChange={(e) => set(i, { percent: Number(e.target.value) })}>
                        <option value={0}>{t("choose")}</option>
                        {RATING_STEPS.map((v) => (
                          <option key={v} value={v}>
                            {v}%
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>
                {ratings.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`${t("remove")} ${i + 1}`}
                    onClick={() => setRatings(ratings.filter((_, j) => j !== i))}
                  >
                    <Icon name="trash" size={20} />
                  </button>
                )}
              </div>
              <label className="row t-caption" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={r.bilateral} onChange={(e) => set(i, { bilateral: e.target.checked })} />
                {t("bilateral")}
              </label>
            </div>
          ))}
          <Button variant="secondary" block onClick={() => setRatings([...ratings, { percent: 0, bilateral: false }])}>
            <Icon name="plus" size={20} />
            {t("add")}
          </Button>
        </div>
      </Card>

      {result.rating >= 30 && (
        <Card>
          <div className="stack">
            <div className="stack-sm">
              <p className="t-heading">{t("familyTitle")}</p>
              <p className="t-caption muted">{t("familyLead")}</p>
            </div>
            <label className="row t-body" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={family.spouse}
                onChange={(e) => setFamily({ ...family, spouse: e.target.checked, spouseAidAttendance: e.target.checked && family.spouseAidAttendance })}
              />
              {t("spouse")}
            </label>
            {family.spouse && (
              <label className="row t-caption" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={family.spouseAidAttendance}
                  onChange={(e) => setFamily({ ...family, spouseAidAttendance: e.target.checked })}
                />
                {t("spouseAA")}
              </label>
            )}
            <div className="field">
              <span className="field__label">{t("parents")}</span>
              <Segmented
                label={t("parents")}
                value={String(family.parents)}
                onChange={(v) => setFamily({ ...family, parents: Number(v) as 0 | 1 | 2 })}
                options={["0", "1", "2"].map((v) => ({ value: v, label: v }))}
              />
            </div>
            <div className="field-row">
              <Field label={t("children")}>
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={family.childrenUnder18}
                    onChange={(e) => setFamily({ ...family, childrenUnder18: count(e.target.value) })}
                  />
                )}
              </Field>
              <Field label={t("school")}>
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={family.schoolChildren}
                    onChange={(e) => setFamily({ ...family, schoolChildren: count(e.target.value) })}
                  />
                )}
              </Field>
            </div>
          </div>
        </Card>
      )}

      {filled.length === 0 ? (
        <p className="t-body muted">{t("empty")}</p>
      ) : (
        <Card className="hero">
          <p className="t-label muted">{t("combinedTitle")}</p>
          <p className="t-money-xl hero__figure">{result.rating}%</p>
          <p className="t-body">{t("exactLine", { exact: result.exact, rating: result.rating })}</p>
          {result.bilateralCombined !== null && (
            <p className="t-caption muted">
              {t("bilateralLine", {
                combined: result.bilateralCombined,
                factor: result.bilateralFactor ?? 0,
                total: Math.round(result.bilateralCombined + (result.bilateralFactor ?? 0)),
              })}
            </p>
          )}
          {filled.length > 1 && sum !== result.exact && (
            <p className="t-caption muted">
              {t("notAdded", { list: filled.map((r) => `${r.percent}%`).join(" + "), exact: result.exact, sum })}
            </p>
          )}
          {monthly !== null && monthly > 0 ? (
            <>
              <p className="t-heading num">{t("monthlyTitle", { amount: formatUSD(monthly) })}</p>
              <p className="t-caption muted">{t("yearly", { amount: formatUSD(monthly * 12) })}</p>
              <p className="t-caption muted">
                {t("effective", { date: formatLongDate(VA_RATES.effective, locale) })}{" "}
                <a href={VA_RATE_TABLE} target="_blank" rel="noreferrer">
                  {t("monthlyLink")}
                </a>
              </p>
            </>
          ) : (
            result.rating > 0 && (
              <p className="t-body">
                {t("lowPending", { rating: result.rating })}{" "}
                <a href={VA_RATE_TABLE} target="_blank" rel="noreferrer">
                  {t("monthlyLink")}
                </a>
              </p>
            )
          )}
        </Card>
      )}

      <Card>
        <div className="stack-sm">
          <p className="t-label">{t("howTitle")}</p>
          <p className="t-body muted">{t("how")}</p>
        </div>
      </Card>

      <p className="t-body">
        {t("help")}{" "}
        <a href={VA_REPRESENTATIVE} target="_blank" rel="noreferrer">
          {t("helpLink")}
        </a>
      </p>
      <p className="t-caption muted">{t("notVa")}</p>
    </main>
  );
}
