"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { useData } from "@/components/DataProvider";
import { BillForm, GoalForm, RecipientForm } from "@/components/forms";
import { usePremium } from "@/components/Premium";
import { canAddGoal, canSendTo } from "@/lib/plan";
import { Icon } from "@/components/Icon";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button, Card, Explain, Field, MoneyInput, ProgressBar } from "@/components/ui";
import { monthlySendCents } from "@/lib/budget";
import { centsToInput, formatUSD, parseCents } from "@/lib/money";

const STEPS = 4;

export default function Setup() {
  const t = useTranslations("setup");
  const c = useTranslations("common");
  const x = useTranslations("explain");
  const router = useRouter();
  const { income, bills, recipients, goals, month, profile, mutate } = useData();
  const { openPremium } = usePremium();
  const [step, setStep] = useState(1);
  const [incomeText, setIncomeText] = useState(income ? centsToInput(income) : "");
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = () => (step < STEPS ? setStep(step + 1) : router.replace("/app"));
  const back = () => setStep(Math.max(1, step - 1));

  async function saveIncome(e: FormEvent) {
    e.preventDefault();
    const cents = parseCents(incomeText);
    if (!cents) {
      setIncomeError(c("amountInvalid"));
      return;
    }
    setIncomeError(null);
    setBusy(true);
    try {
      await mutate((s) => s.setIncome(month, cents));
      next();
    } catch {
      setIncomeError(c("somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  const added = (label: string, amount: string, key: string) => (
    <li key={key} className="list-row">
      <span className="dot" style={{ background: "var(--clara)" }} />
      <span className="t-body grow">{label}</span>
      <span className="t-body num">{amount}</span>
    </li>
  );

  return (
    <main className="page page--bare">
      <header className="topbar">
        {step > 1 ? (
          <button type="button" className="icon-btn" onClick={back} aria-label={c("back")}>
            <Icon name="back" />
          </button>
        ) : (
          <span className="wordmark">Cuenta Clara</span>
        )}
        <LanguageToggle />
      </header>

      <div className="stack-sm">
        <p className="t-caption muted">{t("progress", { step })}</p>
        <ProgressBar value={step / STEPS} label={t("progress", { step })} steps />
      </div>

      {step === 1 && (
        <form className="stack" onSubmit={saveIncome} noValidate>
          <h1 className="t-title">{t("incomeTitle")}</h1>
          <p className="t-body muted">{t("incomeHelp")}</p>
          <Field label={t("incomeLabel")} error={incomeError}>
            {(p) => (
              <MoneyInput big {...p} value={incomeText} autoFocus onChange={(e) => setIncomeText(e.target.value)} />
            )}
          </Field>
          <Explain text={x("income")} />
          <Button type="submit" block disabled={busy}>
            {c("next")}
          </Button>
          <Button variant="ghost" block onClick={next}>
            {c("skip")}
          </Button>
        </form>
      )}

      {step === 2 && (
        <section className="stack">
          <h1 className="t-title">{t("billsTitle")}</h1>
          <p className="t-body muted">{t("billsHelp")}</p>
          {bills.length > 0 && (
            <Card>
              <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label={t("added")}>
                {bills.map((b) => added(b.name, formatUSD(b.amount_cents), b.id))}
              </ul>
            </Card>
          )}
          <BillForm submitLabel={t("addBill")} onSave={(b) => mutate((s) => s.addBill(b))} />
          <Button block onClick={next}>
            {bills.length ? c("next") : c("skip")}
          </Button>
        </section>
      )}

      {step === 3 && (
        <section className="stack">
          <h1 className="t-title">{t("sendsTitle")}</h1>
          <p className="t-body muted">{t("sendsHelp")}</p>
          {recipients.length > 0 && (
            <Card tone="mango">
              <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label={t("added")}>
                {recipients.map((r) => added(r.name, c("perMonth", { amount: formatUSD(monthlySendCents(r)) }), r.id))}
              </ul>
            </Card>
          )}
          <RecipientForm
            submitLabel={t("addSend")}
            defaultCountry={profile?.home_country}
            allow={(r) => canSendTo(profile, recipients, r.country) || (openPremium("countries"), false)}
            onSave={async (r) => {
              await mutate(async (s) => {
                await s.addRecipient(r);
                // The first family send sets the home country used across the app.
                if (!profile?.home_country) await s.updateProfile({ home_country: r.country, home_currency: r.currency });
              });
            }}
          />
          <Button block onClick={next}>
            {recipients.length ? c("next") : c("skip")}
          </Button>
        </section>
      )}

      {step === 4 && (
        <section className="stack">
          <h1 className="t-title">{t("goalTitle")}</h1>
          <p className="t-body muted">{t("goalHelp")}</p>
          {goals.length > 0 && (
            <Card tone="clara">
              <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label={t("added")}>
                {goals.map((g) => added(g.name, formatUSD(g.target_cents), g.id))}
              </ul>
            </Card>
          )}
          {canAddGoal(profile, goals) && (
            <GoalForm submitLabel={c("add")} onSave={(g) => mutate((s) => s.addGoal(g))} />
          )}
          <Button block onClick={next}>
            {t("finish")}
          </Button>
        </section>
      )}
    </main>
  );
}
