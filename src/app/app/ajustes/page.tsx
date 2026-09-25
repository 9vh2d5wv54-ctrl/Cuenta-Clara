"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, useTransition, type FormEvent } from "react";
import { useData } from "@/components/DataProvider";
import { BillForm } from "@/components/forms";
import { Icon } from "@/components/Icon";
import { setLocaleCookie } from "@/components/LanguageToggle";
import Link from "next/link";
import { paywallHref } from "@/components/Plus";
import { formatLongDate } from "@/lib/dates";
import { hadTrial, hasPlus } from "@/lib/plan";
import { Button, Card, Dialog, Explain, Field, MoneyInput, Segmented, Select, Toast } from "@/components/ui";
import { COUNTRIES, countryByCode } from "@/lib/currencies";
import { centsToInput, formatUSD, parseCents } from "@/lib/money";
import type { Locale } from "@/i18n/config";

export default function Ajustes() {
  const t = useTranslations("settings");
  const c = useTranslations("common");
  const s = useTranslations("setup");
  const p = useTranslations("plus");
  const x = useTranslations("explain");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { profile, income, bills, month, store, subscription, hasCheckup, mutate } = useData();
  const plus = hasPlus(subscription);
  const [cancelOpen, setCancelOpen] = useState(false);

  const [incomeText, setIncomeText] = useState(income ? centsToInput(income) : "");
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  async function changeLanguage(next: Locale) {
    setLocaleCookie(next);
    await mutate((st) => st.updateProfile({ language: next })).catch(() => {});
    startTransition(() => router.refresh());
  }

  async function changeCountry(code: string) {
    const ctry = countryByCode(code);
    await mutate((st) =>
      st.updateProfile({ home_country: ctry?.code ?? null, home_currency: ctry?.currency ?? null }),
    ).catch(() => setToast(c("somethingWrong")));
  }

  async function saveIncome(e: FormEvent) {
    e.preventDefault();
    const cents = parseCents(incomeText);
    if (!cents) {
      setIncomeError(c("amountInvalid"));
      return;
    }
    setIncomeError(null);
    try {
      await mutate((st) => st.setIncome(month, cents));
      setToast(t("savedNote"));
    } catch {
      setIncomeError(c("somethingWrong"));
    }
  }

  // Cancel in two taps: "Cancelar Plus" → "Sí, cancelar".
  async function cancelPlus() {
    setCancelOpen(false);
    try {
      await mutate(async (st) => {
        if (!(await st.cancelPlus())) throw new Error("cancel failed");
      });
    } catch {
      setToast(p("cancelFailed"));
    }
  }

  function setting(key: "email_weekly_on" | "email_bills_on", on: boolean) {
    mutate((st) => st.updateProfile({ [key]: on })).catch(() => setToast(c("somethingWrong")));
  }

  const periodEnd = subscription?.renews_at ? formatLongDate(subscription.renews_at.slice(0, 10), locale) : "";

  async function signOut() {
    await store.signOut();
    router.replace("/");
  }

  async function deleteAccount() {
    await store.deleteAccount();
    router.replace("/");
  }

  return (
    <main className="page">
      <h1 className="t-title">{t("title")}</h1>

      <Card>
        <div className="stack">
          <div className="field">
            <span className="field__label">{t("language")}</span>
            <Segmented
              label={t("language")}
              value={locale}
              onChange={changeLanguage}
              options={[
                { value: "es", label: "Español" },
                { value: "en", label: "English" },
              ]}
            />
          </div>
          <Field label={t("homeCountry")} hint={t("homeCountryHelp")}>
            {(p) => (
              <Select {...p} value={profile?.home_country ?? ""} onChange={(e) => changeCountry(e.target.value)}>
                <option value="">{t("none")}</option>
                {COUNTRIES.map((ct) => (
                  <option key={ct.code} value={ct.code}>
                    {ct[locale]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Card>

      {(plus || hasCheckup) && (
        <Card tone={plus ? "clara" : undefined}>
          <div className="stack-sm">
            <div className="row row--between">
              <p className="t-heading">
                {plus ? (subscription?.status === "trialing" ? p("trialActive") : p("active")) : p("name")}
              </p>
              <span className="plus-badge t-caption">{p("badge")}</span>
            </div>
            {plus ? (
              <>
                {periodEnd && (
                  <p className="t-body muted">
                    {subscription?.cancel_at_period_end
                      ? p("ends", { date: periodEnd })
                      : subscription?.status === "trialing"
                        ? p("trialEnds", { date: periodEnd })
                        : p("renews", { date: periodEnd })}
                  </p>
                )}
                {!subscription?.cancel_at_period_end && (
                  <Button variant="ghost" block onClick={() => setCancelOpen(true)}>
                    {p("cancel")}
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="t-body muted">{p("lead")}</p>
                <Link href={paywallHref()} className="btn btn--secondary btn--block">
                  {hadTrial(subscription) ? p("see") : p("trialButton")}
                </Link>
              </>
            )}
          </div>
        </Card>
      )}

      <Card>
        <form className="stack" onSubmit={saveIncome} noValidate>
          <Field label={t("income")} error={incomeError}>
            {(p) => <MoneyInput {...p} value={incomeText} onChange={(e) => setIncomeText(e.target.value)} />}
          </Field>
          <Explain text={x("income")} />
          <Button type="submit" variant="secondary" block>
            {c("save")}
          </Button>
        </form>
      </Card>

      <section className="stack-sm">
        <h2 className="t-heading">{t("bills")}</h2>
        <Card>
          <div className="stack">
            {bills.length === 0 ? (
              <p className="t-body muted">{t("noBills")}</p>
            ) : (
              <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {bills.map((b) => (
                  <li key={b.id} className="list-row">
                    <div className="grow">
                      <p className="t-body">{b.name}</p>
                      <p className="t-caption muted">{t("dueOn", { day: b.due_day })}</p>
                    </div>
                    <span className="t-body num">{formatUSD(b.amount_cents)}</span>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`${c("delete")} ${b.name}`}
                      onClick={() => mutate((st) => st.deleteBill(b.id)).catch(() => setToast(c("somethingWrong")))}
                    >
                      <Icon name="trash" size={20} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <BillForm submitLabel={s("addBill")} onSave={(b) => mutate((st) => st.addBill(b))} />
          </div>
        </Card>
      </section>

      <section className="stack-sm">
        <h2 className="t-heading">{t("emails")}</h2>
        <Card>
          <div className="stack">
            <label className="row" style={{ cursor: "pointer" }}>
              <div className="grow">
                <p className="t-label">{t("weekly")}</p>
                <p className="t-caption muted">{t("weeklyHelp")}</p>
              </div>
              <input
                type="checkbox"
                className="toggle"
                checked={profile?.email_weekly_on ?? true}
                onChange={(e) => setting("email_weekly_on", e.target.checked)}
              />
            </label>
            <label className="row" style={{ cursor: "pointer" }}>
              <div className="grow">
                <p className="t-label">{t("bills")}</p>
                <p className="t-caption muted">{t("billsHelp")}</p>
              </div>
              <input
                type="checkbox"
                className="toggle"
                checked={profile?.email_bills_on ?? true}
                onChange={(e) => setting("email_bills_on", e.target.checked)}
              />
            </label>
          </div>
        </Card>
      </section>

      <div className="stack-sm">
        <Button variant="secondary" block onClick={signOut}>
          <Icon name="logout" size={20} />
          {t("signOut")}
        </Button>
        <Button variant="danger" block onClick={() => setConfirming(true)}>
          {t("deleteAccount")}
        </Button>
        {profile && <p className="t-caption muted" style={{ textAlign: "center" }}>{profile.email}</p>}
      </div>

      <Dialog open={confirming} onClose={() => setConfirming(false)} title={t("deleteAccount")}>
        <p className="t-body">{t("deleteConfirm")}</p>
        <div className="field-row">
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            {c("cancel")}
          </Button>
          <Button variant="danger" onClick={deleteAccount}>
            {t("deleteYes")}
          </Button>
        </div>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} title={p("cancelTitle")}>
        <p className="t-body">{p("cancelBody", { date: periodEnd })}</p>
        <div className="field-row">
          <Button variant="secondary" onClick={() => setCancelOpen(false)}>
            {p("cancelKeep")}
          </Button>
          <Button variant="danger" onClick={cancelPlus}>
            {p("cancelYes")}
          </Button>
        </div>
      </Dialog>

      <Toast message={toast} onDone={clearToast} />
    </main>
  );
}
