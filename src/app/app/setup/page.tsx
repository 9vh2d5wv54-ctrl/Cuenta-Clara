"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { useData } from "@/components/DataProvider";
import { BillForm } from "@/components/forms";
import { Icon, type IconName } from "@/components/Icon";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useSafeToSpend } from "@/components/SafeToSpend";
import { Button, Field, Input, ProgressBar } from "@/components/ui";
import { summarize } from "@/lib/budget";
import { formatShortDate, todayISO } from "@/lib/dates";
import { browserCountry } from "@/lib/country";
import { APP_CURRENCIES, centsToInput, currencyFromCountry, currencyFromLocale, formatUSD, isAppCurrency, parseCents, setAppCurrency, type AppCurrency } from "@/lib/money";
import { monthlyFromPaycheck } from "@/lib/onboarding";
import { addDays } from "@/lib/paycheck";
import type { PaydayCycle } from "@/lib/safe-to-spend";
import { markSetupSeen } from "@/lib/setup-prompt";

// First run, one question per screen, ending on the number that matters: what's
// safe to spend until payday. Each answer is saved as soon as it's given, so
// leaving halfway still keeps what was entered. Family sends and goals come after.

type Cycle = PaydayCycle | "varies";
type Step = "cycle" | "amount" | "payday" | "bill" | "balance" | "done";

const CYCLES: { value: Cycle; icon: IconName }[] = [
  { value: "weekly", icon: "calendar" },
  { value: "biweekly", icon: "calendar" },
  { value: "semimonthly", icon: "calendar" },
  { value: "monthly", icon: "calendar" },
  { value: "varies", icon: "activity" },
];

export default function Setup() {
  const t = useTranslations("onboard");
  const c = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { income, bills, recipients, goals, entries, month, profile, taxPct, mutate } = useData();
  const sts = useSafeToSpend();

  const [step, setStep] = useState<Step>("cycle");
  const [cycle, setCycle] = useState<Cycle>("biweekly");
  const [amount, setAmount] = useState("");
  const [payday, setPayday] = useState(profile?.payday_anchor ?? addDays(todayISO(), 7));
  const [balance, setBalance] = useState(profile?.balance_cents != null ? centsToInput(profile.balance_cents) : "");
  const [currency, setCurrency] = useState<AppCurrency>(isAppCurrency(profile?.currency) ? profile.currency : "USD");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) markSetupSeen(profile.id);
  }, [profile]);

  // New accounts start in the currency of where they are (the website's guess, then the phone's region).
  useEffect(() => {
    if (!profile?.currency || profile.currency === "USD") {
      const country = browserCountry();
      setCurrency(country ? currencyFromCountry(country) : currencyFromLocale(navigator.language));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Saves the currency along with the first answer; before the database update it just shows it. */
  function keepCurrency() {
    setAppCurrency(currency);
    if (currency !== (profile?.currency ?? "USD")) mutate((st) => st.updateProfile({ currency })).catch(() => {});
  }

  const varies = cycle === "varies";
  const order: Step[] = varies ? ["cycle", "amount", "bill", "done"] : ["cycle", "amount", "payday", "bill", "balance", "done"];
  const index = order.indexOf(step);
  const go = (s: Step) => {
    setError(null);
    setStep(s);
  };
  const nextStep = () => go(order[Math.min(order.length - 1, index + 1)]);
  const back = () => go(order[Math.max(0, index - 1)]);

  async function save(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await work();
      nextStep();
    } catch {
      setError(c("somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  const paycheck = parseCents(amount) ?? 0;
  const monthly = varies ? paycheck : monthlyFromPaycheck(paycheck, cycle as PaydayCycle);

  function saveAmount(e: FormEvent) {
    e.preventDefault();
    if (!paycheck) return setError(c("amountInvalid"));
    void save(() => mutate((s) => s.setIncome(month, monthly)));
  }

  function savePayday(e: FormEvent) {
    e.preventDefault();
    if (!payday) return setError(t("paydayInvalid"));
    void save(() => mutate((s) => s.updateProfile({ payday_anchor: payday, payday_cycle: cycle as PaydayCycle })));
  }

  function saveBalance(e: FormEvent) {
    e.preventDefault();
    const negative = balance.trim().startsWith("-");
    const cents = parseCents(balance.replace(/^-/, ""));
    if (cents === null) return setError(c("amountInvalid"));
    void save(() => mutate((s) => s.updateProfile({ balance_cents: negative ? -cents : cents, balance_on: todayISO() })));
  }

  const left = summarize(income ?? 0, bills, recipients, goals, entries, undefined, taxPct).left;

  return (
    <main className="page page--bare onboard">
      <header className="topbar">
        {index > 0 && step !== "done" ? (
          <button type="button" className="icon-btn" onClick={back} aria-label={c("back")}>
            <Icon name="back" />
          </button>
        ) : (
          <span className="wordmark">Cuenta Clara</span>
        )}
        <LanguageToggle />
      </header>

      {step !== "done" && (
        <div className="stack-sm">
          <p className="t-caption muted">{t("progress", { step: index + 1, total: order.length - 1 })}</p>
          <ProgressBar value={(index + 1) / (order.length - 1)} label={t("progress", { step: index + 1, total: order.length - 1 })} steps />
        </div>
      )}

      {step === "cycle" && (
        <section className="stack">
          <h1 className="onboard__q">{t("cycleQ")}</h1>
          <p className="t-body muted">{t("cycleHelp")}</p>
          <div className="onboard__currency" role="radiogroup" aria-label={t("currency")}>
            <span className="t-caption muted">{t("currency")}</span>
            {APP_CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={currency === c}
                className={currency === c ? "pick-chip pick-chip--on" : "pick-chip"}
                onClick={() => {
                  setCurrency(c);
                  setAppCurrency(c);
                }}
              >
                {t(`currency_${c}`)}
              </button>
            ))}
          </div>
          <div className="onboard__choices">
            {CYCLES.map((o) => (
              <button
                key={o.value}
                type="button"
                className={cycle === o.value ? "onboard__choice onboard__choice--on" : "onboard__choice"}
                onClick={() => {
                  setCycle(o.value);
                  keepCurrency();
                  go("amount");
                }}
              >
                <span className="row-icon row-icon--clara" aria-hidden>
                  <Icon name={o.icon} size={18} />
                </span>
                <span className="grow">{t(`cycle_${o.value}`)}</span>
                <Icon name="forward" size={18} />
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "amount" && (
        <form className="stack" onSubmit={saveAmount} noValidate>
          <h1 className="onboard__q">{varies ? t("amountQVaries") : t("amountQ")}</h1>
          <p className="t-body muted">{varies ? t("amountHelpVaries") : t("amountHelp")}</p>
          <BigAmount id="onboard-amount" label={varies ? t("amountLabelVaries") : t("amountLabel")} value={amount} onChange={setAmount} error={error} autoFocus />
          {!varies && paycheck > 0 && <p className="onboard__hint">{t("perMonth", { amount: formatUSD(monthly) })}</p>}
          <Button type="submit" block disabled={busy} className="log-save">
            {c("next")}
          </Button>
        </form>
      )}

      {step === "payday" && (
        <form className="stack" onSubmit={savePayday} noValidate>
          <h1 className="onboard__q">{t("paydayQ")}</h1>
          <p className="t-body muted">{t("paydayHelp")}</p>
          <Field label={t("paydayLabel")} error={error}>
            {(p) => <Input {...p} type="date" value={payday} min={todayISO()} onChange={(e) => setPayday(e.target.value)} />}
          </Field>
          <div className="pick-row">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => {
              const d = addDays(todayISO(), n);
              return (
                <button key={d} type="button" className={payday === d ? "pick-chip pick-chip--on" : "pick-chip"} onClick={() => setPayday(d)}>
                  {n === 1 ? t("tomorrow") : formatShortDate(d, locale)}
                </button>
              );
            })}
          </div>
          <Button type="submit" block disabled={busy} className="log-save">
            {c("next")}
          </Button>
        </form>
      )}

      {step === "bill" && (
        <section className="stack">
          <h1 className="onboard__q">{bills.length ? t("billQMore") : t("billQ")}</h1>
          <p className="t-body muted">{t("billHelp")}</p>
          {bills.length > 0 && (
            <ul className="card list onboard__added" aria-label={t("added")}>
              {bills.map((b) => (
                <li key={b.id} className="list-row">
                  <span className="row-icon row-icon--positive" aria-hidden>
                    <Icon name="check" size={16} />
                  </span>
                  <span className="t-body grow">{b.name}</span>
                  <span className="t-body num">{formatUSD(b.amount_cents)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="card">
            <BillForm submitLabel={t("addBill")} onSave={(b) => mutate((s) => s.addBill(b))} />
          </div>
          <Button block onClick={nextStep} variant={bills.length ? "primary" : "ghost"} className={bills.length ? "log-save" : undefined}>
            {bills.length ? c("next") : t("noBills")}
          </Button>
        </section>
      )}

      {step === "balance" && (
        <form className="stack" onSubmit={saveBalance} noValidate>
          <h1 className="onboard__q">{t("balanceQ")}</h1>
          <p className="t-body muted">{t("balanceHelp")}</p>
          <BigAmount id="onboard-balance" label={t("balanceLabel")} value={balance} onChange={setBalance} error={error} autoFocus />
          <p className="t-caption muted onboard__private">
            <Icon name="shield" size={14} /> {t("private")}
          </p>
          <Button type="submit" block disabled={busy} className="log-save">
            {t("showMe")}
          </Button>
          <Button variant="ghost" block onClick={nextStep}>
            {c("skip")}
          </Button>
        </form>
      )}

      {step === "done" && (
        <section className="stack">
          <section className="hero-card" aria-live="polite">
            <span className="hero-card__sparkles" aria-hidden />
            <div className="hero-card__main">
              <p className="hero-card__label">
                <Icon name="shield" size={18} />
                {sts ? t("safeLabel") : t("leftLabel")}
              </p>
              <p className={(sts ? sts.safe : left) < 0 ? "hero-card__big hero-card__big--neg" : "hero-card__big"}>{formatUSD(sts ? sts.safe : left)}</p>
              <p className="hero-card__plain">
                {sts
                  ? t("safeLine", { date: formatShortDate(sts.payday, locale), days: sts.daysToPayday })
                  : t("leftLine")}
              </p>
              {sts?.perDay != null && sts.perDay > 0 && (
                <div className="hero-card__foot">
                  <p className="hero-card__status hero-card__status--ok">{t("perDay", { amount: formatUSD(sts.perDay) })}</p>
                </div>
              )}
            </div>
          </section>
          <h1 className="onboard__q">{t("doneQ")}</h1>
          <p className="t-body muted">{t("doneHelp")}</p>
          <Button block className="log-save" onClick={() => router.replace("/app")}>
            {t("goHome")}
          </Button>
          <div className="explore-grid">
            <Link href="/app/envios" className="explore-tile">
              <span className="row-icon row-icon--mango" aria-hidden>
                <Icon name="send" size={18} />
              </span>
              <span className="t-label">{t("addFamily")}</span>
            </Link>
            <Link href="/app/metas" className="explore-tile">
              <span className="row-icon row-icon--positive" aria-hidden>
                <Icon name="target" size={18} />
              </span>
              <span className="t-label">{t("addGoal")}</span>
            </Link>
          </div>
          <Link href="/app/chequeo" className="t-label" style={{ textAlign: "center" }}>
            {t("checkup")}
          </Link>
        </section>
      )}
    </main>
  );
}

function BigAmount({
  id,
  label,
  value,
  onChange,
  error,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
  autoFocus?: boolean;
}) {
  return (
    <div className={error ? "amount-hero amount-hero--error" : "amount-hero"}>
      <label htmlFor={id} className="amount-hero__label">
        {label}
      </label>
      <div className="amount-hero__row">
        <span className="amount-hero__dollar" aria-hidden>
          $
        </span>
        <input
          id={id}
          className="amount-hero__input"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          autoFocus={autoFocus}
          value={value}
          style={{ width: `${Math.max(4, value.length) + 0.5}ch` }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
