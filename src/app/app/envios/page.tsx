"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useData } from "@/components/DataProvider";
import { RecipientForm } from "@/components/forms";
import { PlusCard } from "@/components/Plus";
import { hasPlus } from "@/lib/plan";
import { Icon } from "@/components/Icon";
import { Card, Explain } from "@/components/ui";
import { monthlySendCents } from "@/lib/budget";
import { countryByCode, symbolFor } from "@/lib/currencies";
import { formatHome, formatUSD } from "@/lib/money";

type Rates = { updated: string; rates: Record<string, number> };

export default function Envios() {
  const t = useTranslations("sends");
  const c = useTranslations("common");
  const s = useTranslations("setup");
  const x = useTranslations("explain");
  const locale = useLocale() as "es" | "en";
  const { recipients, entries, profile, subscription, mutate } = useData();
  const homeCurrency = profile?.home_currency && profile.home_currency !== "USD" ? profile.home_currency : null;
  const r = useTranslations("rates");
  const p = useTranslations("plus");
  const [rates, setRates] = useState<Rates | null>(null);
  const [ratesFailed, setRatesFailed] = useState(false);

  useEffect(() => {
    fetch("/api/rates")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRates)
      .catch(() => setRatesFailed(true));
  }, []);

  const total = recipients.reduce((sum, r) => sum + monthlySendCents(r), 0);
  const sent = entries.filter((e) => e.type === "send").reduce((sum, e) => sum + e.amount_cents, 0);

  // Group by country so each country's rate shows once.
  const byCountry = new Map<string, typeof recipients>();
  for (const r of recipients) byCountry.set(r.country, [...(byCountry.get(r.country) ?? []), r]);

  return (
    <main className="page">
      <h1 className="t-title">{t("title")}</h1>

      <Card tone="mango">
        <p className="t-label" style={{ color: "var(--mango-ink)" }}>
          {t("monthlyTotal")}
        </p>
        <p className="t-money-xl" style={{ color: "var(--ink)", fontSize: 40, lineHeight: "46px" }}>
          {formatUSD(total)}
        </p>
        <p className="t-body">{t("sentSoFar", { amount: formatUSD(sent) })}</p>
        <Explain text={x("family")} />
      </Card>

      {ratesFailed && <p className="notice t-caption">{t("ratesUnavailable")}</p>}

      {recipients.length === 0 ? (
        <p className="t-body muted">{t("empty")}</p>
      ) : (
        [...byCountry.entries()].map(([code, people]) => {
          const country = countryByCode(code);
          const currency = people[0].currency;
          const rate = currency === "USD" ? 1 : rates?.rates[currency];
          return (
            <section key={code} className="stack-sm">
              <div className="row row--between">
                <h2 className="t-heading">{country ? country[locale] : code}</h2>
                {currency === "USD" ? (
                  <span className="t-caption muted">{t("sameCurrency")}</span>
                ) : rate ? (
                  <span className="t-caption muted num">
                    {t("rate", { rate: `${symbolFor(currency)} ${rate.toFixed(2)}` })}
                  </span>
                ) : null}
              </div>
              <Card>
                <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {people.map((r) => {
                    const monthly = monthlySendCents(r);
                    return (
                      <li key={r.id} className="list-row">
                        <span className="dot" style={{ background: "var(--mango)" }} />
                        <div className="grow">
                          <p className="t-body">{r.name}</p>
                          <p className="t-caption muted">
                            {r.frequency === "biweekly" ? s("biweekly") : s("monthly")} ·{" "}
                            <span className="num">{formatUSD(r.default_amount_cents)}</span>
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p className="t-body num">{c("perMonth", { amount: formatUSD(monthly) })}</p>
                          {currency !== "USD" && rate && (
                            <p className="t-caption num" style={{ color: "var(--mango-ink)" }}>
                              {t("receives", { amount: formatHome((monthly / 100) * rate, currency) })}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={t("remove", { name: r.name })}
                          onClick={() => mutate((st) => st.deleteRecipient(r.id)).catch(() => {})}
                        >
                          <Icon name="trash" size={20} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          );
        })
      )}

      {recipients.some((r) => r.currency !== "USD") && <Explain text={x("exchangeRate")} />}

      <section className="stack-sm">
        <h2 className="t-heading">{t("addTitle")}</h2>
        <Card>
          <RecipientForm
            submitLabel={s("addSend")}
            defaultCountry={profile?.home_country}
            onSave={(r) => mutate((st) => st.addRecipient(r))}
          />
        </Card>
      </section>

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
