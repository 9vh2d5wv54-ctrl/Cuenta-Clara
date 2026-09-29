"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useData } from "@/components/DataProvider";
import { RecipientForm } from "@/components/forms";
import { PlusCard } from "@/components/Plus";
import { hasPlus } from "@/lib/plan";
import { Icon } from "@/components/Icon";
import Link from "next/link";
import { Card, Dialog, Explain } from "@/components/ui";
import { monthlySendCents } from "@/lib/budget";
import { countryByCode, symbolFor } from "@/lib/currencies";
import { formatHome, formatUSD } from "@/lib/money";

type Rates = { updated: string; rates: Record<string, number> };

export default function Envios() {
  const t = useTranslations("sends");
  const s = useTranslations("setup");
  const x = useTranslations("explain");
  const locale = useLocale() as "es" | "en";
  const { recipients, entries, profile, subscription, mutate } = useData();
  const homeCurrency = profile?.home_currency && profile.home_currency !== "USD" ? profile.home_currency : null;
  const r = useTranslations("rates");
  const p = useTranslations("plus");
  const [rates, setRates] = useState<Rates | null>(null);
  const [ratesFailed, setRatesFailed] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/rates")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRates)
      .catch(() => setRatesFailed(true));
  }, []);

  const total = recipients.reduce((sum, r) => sum + monthlySendCents(r), 0);
  const sends = entries.filter((e) => e.type === "send");
  const sent = sends.reduce((sum, e) => sum + e.amount_cents, 0);
  const sentTo = (id: string) => sends.filter((e) => e.recipient_id === id).reduce((sum, e) => sum + e.amount_cents, 0);
  const flag = (code: string) =>
    /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((ch) => 0x1f1a5 + ch.charCodeAt(0))) : "";
  const TONES = ["clara", "positive", "violet"] as const;

  return (
    <main className="page">
      <header className="row row--between" style={{ alignItems: "flex-start" }}>
        <div className="stack-sm">
          <h1 className="t-title">{t("heading")}</h1>
          <p className="t-body muted">{t("lead")}</p>
        </div>
        <button type="button" className="pill-btn pill-btn--solid" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} />
          {t("add")}
        </button>
      </header>

      {recipients.length > 0 && (
        <Card>
          <div className="stack-sm">
            <div className="row row--between">
              <p className="t-label muted">{t("monthlyTotal")}</p>
              <p className="t-heading num">{formatUSD(total)}</p>
            </div>
            <span className="bar bar--positive" role="progressbar" aria-label={t("monthlyTotal")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={total ? Math.round(Math.min(1, sent / total) * 100) : 0}>
              <span style={{ width: `${total ? Math.min(1, sent / total) * 100 : 0}%` }} />
            </span>
            <p className="t-caption muted">{t("sentSoFar", { amount: formatUSD(sent) })}</p>
            <Explain text={x("family")} />
          </div>
        </Card>
      )}

      {ratesFailed && <p className="notice t-caption">{t("ratesUnavailable")}</p>}

      {recipients.length === 0 ? (
        <button type="button" className="card add-card" onClick={() => setAdding(true)}>
          <span className="grow stack-sm">
            <span className="t-heading">{t("emptyTitle")}</span>
            <span className="t-body muted">{t("empty")}</span>
          </span>
          <span className="add-card__plus" aria-hidden>
            <Icon name="plus" />
          </span>
        </button>
      ) : (
        <section className="stack-sm">
          <h2 className="t-heading">{t("recipients")}</h2>
          {recipients.map((r, i) => {
            const country = countryByCode(r.country);
            const monthly = monthlySendCents(r);
            const done = sentTo(r.id);
            const pct = monthly ? Math.min(1, done / monthly) : 0;
            const rate = r.currency === "USD" ? 1 : rates?.rates[r.currency];
            const tone = TONES[i % TONES.length];
            return (
              <article key={r.id} className="card person-card">
                <div className="row">
                  <span className={`person-card__avatar goal-icon--${tone}`} aria-hidden>
                    {r.name.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <div className="grow">
                    <p className="t-heading">
                      {r.name} <span aria-hidden>{flag(r.country)}</span>
                    </p>
                    <p className="t-caption muted">{country ? country[locale] : r.country}</p>
                  </div>
                  <span className="tag">{r.frequency === "biweekly" ? s("biweekly") : s("monthly")}</span>
                  <details className="menu">
                    <summary className="icon-btn" aria-label={t("options", { name: r.name })}>
                      <Icon name="more" size={22} />
                    </summary>
                    <div className="menu__list">
                      <button type="button" onClick={() => mutate((st) => st.deleteRecipient(r.id)).catch(() => {})}>
                        <Icon name="trash" size={18} />
                        {t("remove", { name: r.name })}
                      </button>
                    </div>
                  </details>
                </div>
                <div className="row row--between" style={{ alignItems: "flex-end" }}>
                  <div>
                    <p className="person-card__amount num">{formatUSD(r.default_amount_cents)}</p>
                    {r.currency !== "USD" && rate ? (
                      <p className="t-caption num tone-clara">
                        {t("receives", { amount: formatHome((r.default_amount_cents / 100) * rate, r.currency) })} ·{" "}
                        {t("rate", { rate: `${symbolFor(r.currency)} ${rate.toFixed(2)}` })}
                      </p>
                    ) : r.currency === "USD" ? (
                      <p className="t-caption muted">{t("sameCurrency")}</p>
                    ) : null}
                  </div>
                  <span className={pct >= 1 ? "status-tag status-tag--done" : "status-tag"}>
                    {pct >= 1 ? t("statusDone") : t("statusLeft", { amount: formatUSD(monthly - done) })}
                  </span>
                </div>
                <span className={`bar bar--${pct >= 1 ? "positive" : tone}`} role="progressbar" aria-label={r.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)}>
                  <span style={{ width: `${pct * 100}%` }} />
                </span>
                <div className="row row--between t-caption muted">
                  <span>{t("sentThisMonth")}</span>
                  <span className="num">
                    {formatUSD(done)} {t("of")} {formatUSD(monthly)}
                  </span>
                </div>
                {pct < 1 && (
                  <Link href={`/app/add?type=send&to=${r.id}`} className="t-label person-card__log">
                    {t("logSend", { name: r.name })}
                  </Link>
                )}
              </article>
            );
          })}
          <button type="button" className="card add-card" onClick={() => setAdding(true)}>
            <span className="grow stack-sm">
              <span className="t-heading">{t("addNew")}</span>
              <span className="t-caption add-card__lead">{t("addNewLead")}</span>
            </span>
            <span className="add-card__plus" aria-hidden>
              <Icon name="plus" />
            </span>
          </button>
        </section>
      )}

      {recipients.some((r) => r.currency !== "USD") && <Explain text={x("exchangeRate")} />}

      <Dialog open={adding} onClose={() => setAdding(false)} title={t("addTitle")}>
        <RecipientForm
          submitLabel={s("addSend")}
          defaultCountry={profile?.home_country}
          onSave={async (r) => {
            await mutate((st) => st.addRecipient(r));
            setAdding(false);
          }}
        />
      </Dialog>

      {homeCurrency &&
        (hasPlus(subscription) ? (
          <Card>
            <label className="row" style={{ cursor: "pointer" }}>
              <div className="grow">
                <p className="t-label">{r("title")}</p>
                <p className="t-caption muted">{r("help", { currency: homeCurrency })}</p>
              </div>
              <input
                type="checkbox"
                className="toggle"
                checked={profile?.rate_alert_on ?? false}
                onChange={(e) => mutate((st) => st.updateProfile({ rate_alert_on: e.target.checked })).catch(() => {})}
              />
            </label>
          </Card>
        ) : (
          <PlusCard feature="rates" title={p("ratesTitle")} />
        ))}

      {/* Required attribution for ExchangeRate-API's open access endpoint. */}
      <p className="credit">
        <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">
          {t("credit")}
        </a>
        {rates && (
          <>
            {" · "}
            {t("ratesUpdated", {
              date: new Date(rates.updated).toLocaleDateString(locale === "es" ? "es-US" : "en-US", {
                day: "numeric",
                month: "short",
              }),
            })}
          </>
        )}
      </p>
    </main>
  );
}
