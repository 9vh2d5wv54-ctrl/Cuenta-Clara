"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, useTransition, type FormEvent } from "react";
import { useData } from "@/components/DataProvider";
import { BillForm } from "@/components/forms";
import { Icon } from "@/components/Icon";
import { setLocaleCookie } from "@/components/LanguageToggle";
import { usePremium } from "@/components/Premium";
import { entriesToCsv, downloadText } from "@/lib/csv";
import { formatLongDate, todayISO } from "@/lib/dates";
import { isPremium } from "@/lib/plan";
import { Button, Card, Dialog, Explain, Field, MoneyInput, Segmented, Select, Toast } from "@/components/ui";
import { COUNTRIES, countryByCode } from "@/lib/currencies";
import { centsToInput, formatUSD, parseCents } from "@/lib/money";
import type { Locale } from "@/i18n/config";

export default function Ajustes() {
  const t = useTranslations("settings");
  const c = useTranslations("common");
  const s = useTranslations("setup");
  const p = useTranslations("premium");
  const { openPremium } = usePremium();
  const x = useTranslations("explain");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { profile, income, bills, month, store, mutate } = useData();

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

  async function exportCsv() {
    if (!isPremium(profile)) {
      openPremium("export");
      return;
    }
    const all = await store.listAllEntries();
    downloadText(`cuenta-clara-${todayISO()}.csv`, entriesToCsv(all));
  }

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

      <Card tone={isPremium(profile) ? "clara" : undefined}>
        <div className="stack-sm">
          <div className="row row--between">
            <p className="t-heading">{isPremium(profile) ? p("active") : p("name")}</p>
            <span className="premium-badge t-caption">{p("badge")}</span>
          </div>
          {isPremium(profile) ? (
            <>
              {profile?.premium_period_end && (
                <p className="t-body muted">
                  {p(profile.premium_cancel_at_period_end ? "ends" : "renews", {
                    date: formatLongDate(profile.premium_period_end.slice(0, 10), locale),
                  })}
                </p>
              )}
              {store.mode === "supabase" && (
                <a className="t-label" href="https://whop.com" target="_blank" rel="noopener">
                  {p("manage")}
                </a>
              )}
            </>
          ) : (
            <>
              <p className="t-body muted">{p("lead")}</p>
              <Button variant="secondary" block onClick={() => openPremium()}>
                {p("upgrade")}
              </Button>
            </>
          )}
          <Button variant="ghost" block onClick={exportCsv}>
            {p("exportCsv")}
          </Button>
        </div>
      </Card>

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

      <Card>
        <label className="row" style={{ cursor: "pointer" }}>
          <div className="grow">
            <p className="t-label">{t("reminders")}</p>
            <p className="t-caption muted">{t("remindersHelp")}</p>
          </div>
          <input
            type="checkbox"
            checked={profile?.reminders_on ?? true}
            onChange={(e) =>
              mutate((st) => st.updateProfile({ reminders_on: e.target.checked })).catch(() =>
                setToast(c("somethingWrong")),
              )
            }
            style={{ width: 24, height: 24, accentColor: "var(--clara)" }}
          />
        </label>
      </Card>

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

      <Toast message={toast} onDone={clearToast} />
    </main>
  );
}
