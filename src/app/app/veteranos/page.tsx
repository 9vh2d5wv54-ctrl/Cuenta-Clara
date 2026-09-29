"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { SwitchRow, VetNav } from "@/components/VetNav";
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

      <VetNav />

      {ratings.map((r, i) => (
        <section key={i} className="card stack-sm">
          <div className="row row--between">
            <h2 className="t-label" id={`rating-${i}`}>
              {t("rating")} {i + 1}
            </h2>
            {ratings.length > 1 && (
              <button type="button" className="icon-btn" aria-label={`${t("remove")} ${i + 1}`} onClick={() => setRatings(ratings.filter((_, j) => j !== i))}>
                <Icon name="trash" size={20} />
              </button>
            )}
          </div>
          <div className="rating-grid" role="radiogroup" aria-labelledby={`rating-${i}`}>
            {RATING_STEPS.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={r.percent === v}
                className={r.percent === v ? "rating-chip rating-chip--on" : "rating-chip"}
                onClick={() => set(i, { percent: r.percent === v ? 0 : v })}
              >
                {v}%
              </button>
            ))}
          </div>
          <SwitchRow label={t("bilateral")} checked={r.bilateral} onChange={(on) => set(i, { bilateral: on })} />
        </section>
      ))}
      <button type="button" className="pill-btn" style={{ alignSelf: "flex-start" }} onClick={() => setRatings([...ratings, { percent: 0, bilateral: false }])}>
        <Icon name="plus" size={18} />
        {t("add")}
      </button>

      {filled.length === 0 ? (
        <p className="t-body muted">{t("empty")}</p>
      ) : (
        <section className="hero-card" aria-label={t("estimateLabel")}>
          <span className="hero-card__sparkles" aria-hidden />
          <div className="hero-card__main">
            <p className="hero-card__label">
              <Icon name="shield" size={18} />
              {t("estimateLabel")}
            </p>
            <p className="hero-card__big">{result.rating}%</p>
            <p className="hero-card__plain">
              <span className="muted">{t("ratingOf", { n: filled.length })}</span>
              <br />
              {t("exactLine", { exact: result.exact, rating: result.rating })}
            </p>
            {result.bilateralCombined !== null && (
              <p className="hero-card__plain muted">
                {t("bilateralLine", {
                  combined: result.bilateralCombined,
                  factor: result.bilateralFactor ?? 0,
                  total: Math.round(result.bilateralCombined + (result.bilateralFactor ?? 0)),
                })}
              </p>
            )}
            {filled.length > 1 && sum !== result.exact && (
              <p className="hero-card__plain muted">
                {t("notAdded", { list: filled.map((r) => `${r.percent}%`).join(" + "), exact: result.exact, sum })}
              </p>
            )}
            <div className="hero-card__foot">
              {monthly !== null && monthly > 0 ? (
                <>
                  <p className="hero-card__status hero-card__status--ok num">{t("monthlyTitle", { amount: formatUSD(monthly) })}</p>
                  <p className="muted">{t("yearly", { amount: formatUSD(monthly * 12) })}</p>
                  <p className="muted">
                    {t("effective", { date: formatLongDate(VA_RATES.effective, locale) })}{" "}
                    <a href={VA_RATE_TABLE} target="_blank" rel="noreferrer" className="hero-card__link">
                      {t("monthlyLink")}
                    </a>
                  </p>
                </>
              ) : (
                result.rating > 0 && (
                  <p>
                    {t("lowPending", { rating: result.rating })}{" "}
                    <a href={VA_RATE_TABLE} target="_blank" rel="noreferrer" className="hero-card__link">
                      {t("monthlyLink")}
                    </a>
                  </p>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {result.rating >= 30 && (
        <section className="card stack">
          <div className="stack-sm">
            <h2 className="t-heading">{t("familyTitle")}</h2>
            <p className="t-caption muted">{t("familyLead")}</p>
          </div>
          <SwitchRow
            label={t("spouse")}
            checked={family.spouse}
            onChange={(on) => setFamily({ ...family, spouse: on, spouseAidAttendance: on && family.spouseAidAttendance })}
          />
          {family.spouse && (
            <SwitchRow label={t("spouseAA")} checked={family.spouseAidAttendance} onChange={(on) => setFamily({ ...family, spouseAidAttendance: on })} />
          )}
          <Stepper label={t("parents")} value={family.parents} max={2} onChange={(n) => setFamily({ ...family, parents: n as 0 | 1 | 2 })} />
          <Stepper label={t("children")} value={family.childrenUnder18} max={20} onChange={(n) => setFamily({ ...family, childrenUnder18: count(String(n)) })} />
          <Stepper label={t("school")} value={family.schoolChildren} max={20} onChange={(n) => setFamily({ ...family, schoolChildren: count(String(n)) })} />
        </section>
      )}

      <details className="card fold">
        <summary className="fold__summary">
          <span className="row-icon row-icon--clara" aria-hidden>
            <Icon name="info" size={18} />
          </span>
          <span className="t-label grow">{t("howShort")}</span>
          <span className="fold__chevron" aria-hidden>
            <Icon name="forward" size={20} />
          </span>
        </summary>
        <div className="fold__body">
          <p className="t-body muted" style={{ marginTop: 12 }}>{t("how")}</p>
        </div>
      </details>

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

function Stepper({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (n: number) => void }) {
  const t = useTranslations("veterans");
  return (
    <div className="switch-row">
      <span className="t-body grow">{label}</span>
      <span className="stepper">
        <button type="button" aria-label={`${t("fewer")}: ${label}`} disabled={value <= 0} onClick={() => onChange(value - 1)}>
          −
        </button>
        <span className="num" aria-live="polite">
          {value}
        </span>
        <button type="button" aria-label={`${t("more")}: ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </span>
    </div>
  );
}
