"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { useData } from "./DataProvider";
import { Icon } from "./Icon";
import { PlusPreview } from "./Plus";
import { Button, Card, Explain, Field, Input, MoneyInput, Segmented } from "./ui";
import { addDays, currentPayPeriod } from "@/lib/paycheck";
import { centsToInput, formatUSD, parseCents } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { hasPlus } from "@/lib/plan";
import { nextPayday, PAYDAY_CYCLES, projectToPayday, safeToSpend, type PaydayCycle } from "@/lib/safe-to-spend";

function dayLabel(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString(locale === "es" ? "es-US" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Setup and edits: balance, next payday and how often, and the cushion. */
function SetupForm({ onDone, full }: { onDone: () => void; full: boolean }) {
  const t = useTranslations("safe");
  const c = useTranslations("common");
  const { profile, mutate } = useData();
  const [balance, setBalance] = useState(profile?.balance_cents != null ? centsToInput(profile.balance_cents) : "");
  const [payday, setPayday] = useState(profile?.payday_anchor ?? addDays(todayISO(), 7));
  const [cycle, setCycle] = useState<PaydayCycle>(profile?.payday_cycle ?? "biweekly");
  const [buffer, setBuffer] = useState(profile?.buffer_cents ? centsToInput(profile.buffer_cents) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const cents = parseCents(balance.replace(/^-/, ""));
    const negative = balance.trim().startsWith("-");
    const bufferCents = buffer.trim() ? parseCents(buffer) : 0;
    if (cents === null || bufferCents === null) return setError(t("amountInvalid"));
    setError(null);
    setBusy(true);
    try {
      await mutate((s) =>
        s.updateProfile({
          balance_cents: negative ? -cents : cents,
          balance_on: todayISO(),
          ...(full ? { payday_anchor: payday, payday_cycle: cycle, buffer_cents: bufferCents } : {}),
        }),
      );
      onDone();
    } catch {
      setError(c("somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={save} noValidate>
      <Field label={t("balance")} error={error}>
        {(p) => <MoneyInput big={full} {...p} value={balance} onChange={(e) => setBalance(e.target.value)} />}
      </Field>
      {full && (
        <>
          <Field label={t("payday")}>
            {(p) => <Input {...p} type="date" value={payday} onChange={(e) => setPayday(e.target.value)} />}
          </Field>
          <div className="field">
            <span className="field__label">{t("cycle")}</span>
            <Segmented
              label={t("cycle")}
              value={cycle}
              onChange={setCycle}
              options={PAYDAY_CYCLES.map((v) => ({ value: v, label: t(v) }))}
            />
            {cycle === "semimonthly" && <p className="field__hint">{t("cycleHint")}</p>}
          </div>
          <Field label={t("buffer")}>
            {(p) => <MoneyInput {...p} value={buffer} onChange={(e) => setBuffer(e.target.value)} />}
          </Field>
        </>
      )}
      <Button type="submit" block disabled={busy}>
        {full ? t("save") : t("saveBalance")}
      </Button>
    </form>
  );
}

/** The payday Safe to Spend counts to: paycheck mode's (Plus), or the one they set. */
function usePayday(): string | null {
  const { profile, subscription, recent, bills, recipients, goals, taxPct } = useData();
  const plus = hasPlus(subscription);
  const period = plus && profile?.pay_frequency ? currentPayPeriod(profile.pay_frequency, recent, bills, recipients, goals, undefined, taxPct) : null;
  return period && period.daysLeft > 0
    ? period.nextPayday
    : profile?.payday_anchor && profile.payday_cycle
      ? nextPayday(profile.payday_anchor, profile.payday_cycle, todayISO())
      : null;
}

/** Safe to Spend right now, or null until a balance and payday are set. Home's big number uses it. */
export function useSafeToSpend() {
  const { profile, recent, bills, recipients } = useData();
  const payday = usePayday();
  if (profile?.balance_cents == null || !profile.balance_on || !payday) return null;
  return safeToSpend({ balance: profile.balance_cents, balanceOn: profile.balance_on, payday, buffer: profile.buffer_cents ?? 0, bills, recipients, recent });
}

/**
 * Free: what's safe to spend until payday, starting from the balance they type. Plus: day by day.
 * With `details`, the big number is left out (Home shows it at the top).
 */
export function SafeToSpendCard({ details = false }: { details?: boolean }) {
  const t = useTranslations("safe");
  const locale = useLocale();
  const { profile, subscription, recent, bills, recipients } = useData();
  const [editing, setEditing] = useState<"none" | "balance" | "setup">("none");

  const hasBalance = profile?.balance_cents != null && Boolean(profile?.balance_on);
  const plus = hasPlus(subscription);
  const payday = usePayday();

  if (!hasBalance || !payday || editing === "setup") {
    return (
      <Card>
        <div className="stack">
          <div className="stack-sm">
            <p className="t-heading">{t("setupTitle")}</p>
            <p className="t-body muted">{t("setupLead")}</p>
          </div>
          <SetupForm full onDone={() => setEditing("none")} />
          {editing === "setup" && (
            <Button variant="ghost" block onClick={() => setEditing("none")}>
              {t("cancel")}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const s = safeToSpend({
    balance: profile!.balance_cents!,
    balanceOn: profile!.balance_on!,
    payday,
    buffer: profile?.buffer_cents ?? 0,
    bills,
    recipients,
    recent,
  });
  const negative = s.safe < 0;
  const lines = [
    { key: "bills", label: t("lineBills"), value: s.bills, detail: s.billsDue.map((b) => `${b.bill.name} (${dayLabel(b.date, locale)})`).join(", ") },
    { key: "family", label: t("lineFamily"), value: s.family, detail: "" },
    { key: "buffer", label: t("lineBuffer"), value: s.buffer, detail: "" },
  ].filter((l) => l.value > 0);
  const days = projectToPayday(s);

  const inner = (
    <>
      {!details && (
        <div className="row" style={{ justifyContent: "center" }}>
          <p className="t-label muted">{t("title")}</p>
        </div>
      )}
      {!details && (
        <>
          <p className={negative ? "t-money-xl hero__figure hero__figure--negative" : "t-money-xl hero__figure"}>
            {formatUSD(s.safe)}
          </p>
          <p className="t-body">{t("untilPayday", { date: dayLabel(s.payday, locale), days: s.daysToPayday })}</p>
        </>
      )}
      {negative ? (
        <p className="notice notice--alerta t-caption" role="alert">
          {t("over", { amount: formatUSD(-s.safe) })}
        </p>
      ) : (
        !details && s.perDay !== null && <p className="t-caption muted">{t("perDay", { amount: formatUSD(s.perDay) })}</p>
      )}

      <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0, textAlign: "start" }}>
        <li className="list-row">
          <span className="grow">
            <span className="t-body">{t("lineBalance")}</span>
            <span className="t-caption muted" style={{ display: "block" }}>
              {s.staleDays === 0 ? t("updatedToday") : t("updatedAgo", { days: s.staleDays })}
            </span>
          </span>
          <span className="t-body num">{formatUSD(s.typed)}</span>
        </li>
        {s.sinceTyped !== 0 && (
          <li className="list-row">
            <span className="t-body grow">{t("lineSince")}</span>
            <span className="t-body num">
              {s.sinceTyped > 0 ? "+" : "−"}
              {formatUSD(Math.abs(s.sinceTyped))}
            </span>
          </li>
        )}
        {lines.map((l) => (
          <li key={l.key} className="list-row">
            <span className="grow">
              <span className="t-body">{l.label}</span>
              {l.detail && (
                <span className="t-caption muted" style={{ display: "block" }}>
                  {l.detail}
                </span>
              )}
            </span>
            <span className="t-body num">−{formatUSD(l.value)}</span>
          </li>
        ))}
      </ul>

      {s.staleDays >= 3 && editing !== "balance" && <p className="notice t-caption">{t("stale")}</p>}

      {editing === "balance" ? (
        <div className="stack-sm" style={{ textAlign: "start" }}>
          <SetupForm full={false} onDone={() => setEditing("none")} />
          <Button variant="ghost" block onClick={() => setEditing("none")}>
            {t("cancel")}
          </Button>
        </div>
      ) : (
        <Button variant="secondary" block onClick={() => setEditing("balance")}>
          {t("update")}
        </Button>
      )}

      {days.length > 0 &&
        (() => {
          const table = (
            <div className="stack-sm" style={{ textAlign: "start" }}>
              <p className="t-label">{t("projection")}</p>
              <p className="t-caption muted">{t("projectionLead")}</p>
              <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {days.map((d) => (
                  <li key={d.date} className="list-row">
                    <span className="grow">
                      <span className="t-body">{dayLabel(d.date, locale)}</span>
                      {d.bills.length > 0 && (
                        <span className="t-caption muted" style={{ display: "block" }}>
                          {d.bills.map((b) => `${b.name} −${formatUSD(b.amount)}`).join(", ")}
                        </span>
                      )}
                    </span>
                    <span className={d.balance < 0 ? "t-body num forecast__neg" : "t-body num"}>{formatUSD(d.balance)}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
          return plus ? table : <PlusPreview feature="projection" label={t("plusProjection")}>{table}</PlusPreview>;
        })()}

      <Explain text={t("explain")} />
      <button type="button" className="t-caption link-button" onClick={() => setEditing("setup")}>
        {t("editSetup")}
      </button>
    </>
  );

  if (details) {
    // Home: the big number is on the hero card, so the breakdown folds away.
    return (
      <details className="card fold">
        <summary className="fold__summary">
          <span className="grow stack-sm">
            <span className="t-heading">{t("detailsTitle")}</span>
            <span className="t-caption muted">{t("detailsLead", { amount: formatUSD(s.safe) })}</span>
          </span>
          <span className="fold__chevron" aria-hidden>
            <Icon name="forward" size={20} />
          </span>
        </summary>
        <div className="fold__body hero">{inner}</div>
      </details>
    );
  }

  return <Card className="hero">{inner}</Card>;
}
