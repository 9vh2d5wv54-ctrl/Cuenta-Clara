"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Button, Card, Field, Select } from "@/components/ui";
import { formatUSD } from "@/lib/money";
import { combinedRating, RATING_STEPS, type Rating } from "@/lib/va";
import { VA_RATES } from "@/lib/va-rates";

const VA_RATE_TABLE = "https://www.va.gov/disability/compensation-rates/veteran-rates/";
const VA_REPRESENTATIVE = "https://www.va.gov/get-help-from-accredited-representative/";

// Veterans track (free): combined disability rating the way VA calculates it.
// Estimates only; never presented as the VA.
export default function Veteranos() {
  const t = useTranslations("veterans");
  const [ratings, setRatings] = useState<Rating[]>([{ percent: 0, bilateral: false }]);

  const set = (i: number, r: Partial<Rating>) => setRatings(ratings.map((x, j) => (j === i ? { ...x, ...r } : x)));
  const filled = ratings.filter((r) => r.percent > 0);
  const result = combinedRating(filled);
  const sum = filled.reduce((s, r) => s + r.percent, 0);
  const monthly = VA_RATES?.alone[result.rating] ?? null;

  return (
    <main className="page">
      <div className="stack-sm">
        <h1 className="t-title">{t("title")}</h1>
        <p className="t-body muted">{t("lead")}</p>
      </div>

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
          {monthly !== null ? (
            <p className="t-body num">{formatUSD(monthly)}</p>
          ) : (
            result.rating > 0 && (
              <p className="t-body">
                {t("monthlyPending", { rating: result.rating })}{" "}
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
