"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/components/Icon";
import { PlusPreview } from "@/components/Plus";
import { Button, Card, Dialog, Field, Input, MoneyInput, ProgressBar, Segmented } from "@/components/ui";
import { monthFromNow, progress, simulate, type PayoffPlan } from "@/lib/debts";
import { monthName } from "@/lib/forecast";
import { formatUSD, parseCents } from "@/lib/money";
import { hasPlus } from "@/lib/plan";
import type { Debt } from "@/lib/types";

const EXTRAS = [0, 2500, 5000, 10000, 20000];

function DebtForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("debts");
  const c = useTranslations("common");
  const { mutate } = useData();
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [apr, setApr] = useState("");
  const [min, setMin] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const balanceCents = parseCents(balance);
    const minCents = parseCents(min);
    const rate = Number(apr.replace(",", ".").replace("%", ""));
    const next = {
      name: name.trim() ? undefined : c("nameRequired"),
      balance: balanceCents ? undefined : c("amountInvalid"),
      apr: apr.trim() && Number.isFinite(rate) && rate >= 0 && rate <= 100 ? undefined : t("aprInvalid"),
      min: minCents ? undefined : c("amountInvalid"),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean) || !balanceCents || !minCents) return;
    setBusy(true);
    try {
      await mutate((s) =>
        s.addDebt({ name: name.trim(), balance_cents: balanceCents, apr: Math.round(rate * 100) / 100, min_payment_cents: minCents }),
      );
      setName("");
      setBalance("");
      setApr("");
      setMin("");
      onDone();
    } catch {
      setErrors({ name: c("somethingWrong") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={save} noValidate>
      <Field label={t("name")} error={errors.name}>
        {(p) => <Input {...p} value={name} placeholder={t("namePlaceholder")} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <div className="field-row">
        <Field label={t("balance")} error={errors.balance}>
          {(p) => <MoneyInput {...p} value={balance} onChange={(e) => setBalance(e.target.value)} />}
        </Field>
        <Field label={t("min")} error={errors.min}>
          {(p) => <MoneyInput {...p} value={min} onChange={(e) => setMin(e.target.value)} />}
        </Field>
      </div>
      <Field label={t("apr")} hint={t("aprHint")} error={errors.apr}>
        {(p) => <Input {...p} inputMode="decimal" placeholder="24.99" value={apr} onChange={(e) => setApr(e.target.value)} />}
      </Field>
      <Button type="submit" variant="secondary" block disabled={busy}>
        {t("save")}
      </Button>
    </form>
  );
}

// Debt payoff simulator. Free: payoff with minimums, snowball vs. avalanche.
// Plus: "what if I add $X a month", milestones and a countdown.
export default function Deudas() {
  const t = useTranslations("debts");
  const c = useTranslations("common");
  const locale = useLocale();
  const { debts, subscription, mutate } = useData();
  const plus = hasPlus(subscription);
  const [adding, setAdding] = useState(debts.length === 0);
  const [extra, setExtra] = useState(5000);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [deleting, setDeleting] = useState<Debt | null>(null);

  const open = debts.filter((d) => d.balance_cents > 0);
  const when = (plan: PayoffPlan) => (plan.months === null ? null : monthName(monthFromNow(plan.months), locale, true));
  const minimum = simulate(open, "minimum");
  const snowball = simulate(open, "snowball");
  const avalanche = simulate(open, "avalanche");
  const withExtra = simulate(open, "avalanche", extra);
  const p = progress(debts);

  async function saveBalance(e: FormEvent) {
    e.preventDefault();
    const cents = parseCents(newBalance);
    if (cents === null || !editing) return;
    const debt = editing;
    await mutate((s) => s.updateDebtBalance(debt.id, cents)).catch(() => {});
    setEditing(null);
  }

  const planCard = (plan: PayoffPlan, title: string, why: string) => (
    <div className="stack-sm">
      <p className="t-label">{title}</p>
      <p className="t-caption muted">{why}</p>
      {plan.months === null ? (
        <p className="t-body">{t("never")}</p>
      ) : (
        <>
          <p className="t-body">
            {t("debtFree", { date: when(plan)! })} · {t("months", { months: plan.months })}
          </p>
          <p className="t-caption muted">
            {t("interest", { amount: formatUSD(plan.interest) })}
            {minimum.months !== null && minimum.interest > plan.interest
              ? ` · ${t("saves", { amount: formatUSD(minimum.interest - plan.interest) })}`
              : ""}
          </p>
          <p className="t-caption muted">
            {t("order", {
              list: [...plan.debts]
                .filter((d) => d.paidOffMonth !== null)
                .sort((a, b) => a.paidOffMonth! - b.paidOffMonth!)
                .map((d) => d.name)
                .join(" → "),
            })}
          </p>
        </>
      )}
    </div>
  );

  const whatIf = (
    <div className="stack-sm">
      <p className="t-label">{t("whatIf")}</p>
      <Segmented
        label={t("whatIf")}
        value={String(extra)}
        onChange={(v) => setExtra(Number(v))}
        options={EXTRAS.map((cents) => ({ value: String(cents), label: t("extra", { amount: formatUSD(cents).replace(".00", "") }) }))}
      />
      {extra === 0 || withExtra.months === null || avalanche.months === null ? (
        <p className="t-caption muted">{withExtra.months === null ? t("never") : t("whatIfNone")}</p>
      ) : (
        <p className="t-body">
          {t("whatIfResult", {
            date: when(withExtra)!,
            months: t("months", { months: avalanche.months - withExtra.months }),
            amount: formatUSD(avalanche.interest - withExtra.interest),
          })}
        </p>
      )}
    </div>
  );

  return (
    <main className="page">
      <div className="stack-sm">
        <h1 className="t-title">{t("title")}</h1>
        <p className="t-body muted">{t("lead")}</p>
      </div>

      {open.length > 0 && (
        <>
          <Card className="hero">
            <p className="t-label muted">{t("owe")}</p>
            <p className="t-money-xl hero__figure">{formatUSD(p.now)}</p>
            {minimum.months === null ? (
              <p className="notice notice--alerta t-caption" role="alert">
                {t("never")}
              </p>
            ) : (
              <p className="t-body">
                {t("minTitle")}: {t("debtFree", { date: when(minimum)! })} · {t("interest", { amount: formatUSD(minimum.interest) })}
              </p>
            )}
          </Card>

          {plus && p.start > 0 && (
            <Card tone="clara">
              <div className="stack-sm">
                <div className="row row--between">
                  <p className="t-label">{t("progressTitle")}</p>
                  <span className="t-caption">{Math.round(p.share * 100)}%</span>
                </div>
                <ProgressBar value={p.share} label={t("progressTitle")} />
                <p className="t-caption muted">
                  {t("progressLine", { paid: formatUSD(p.paid), start: formatUSD(p.start) })}
                  {p.paidOff > 0 ? ` · ${t("paidOffCount", { count: p.paidOff })}` : ""}
                </p>
                {avalanche.months !== null && <p className="t-body">{t("countdown", { months: avalanche.months })}</p>}
              </div>
            </Card>
          )}

          <Card>
            <div className="stack">
              <div className="stack-sm">
                <p className="t-heading">{t("compareTitle")}</p>
                <p className="t-caption muted">{t("compareLead")}</p>
              </div>
              {planCard(avalanche, t("avalanche"), t("avalancheWhy"))}
              {planCard(snowball, t("snowball"), t("snowballWhy"))}
            </div>
          </Card>

          <Card>{plus ? whatIf : <PlusPreview feature="debts" label={t("plusWhatIf")}>{whatIf}</PlusPreview>}</Card>
        </>
      )}

      {debts.length > 0 && (
        <section className="stack-sm">
          <h2 className="t-heading">{t("yourDebts")}</h2>
          <Card>
            <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {debts.map((d) => (
                <li key={d.id} className="list-row">
                  <div className="grow">
                    <p className="t-body">
                      {d.name}
                      {d.balance_cents === 0 && (
                        <span className="t-caption" style={{ marginInlineStart: 8 }}>
                          <Icon name="check" size={16} /> {t("paidOff")}
                        </span>
                      )}
                    </p>
                    <p className="t-caption muted">{t("debtLine", { apr: d.apr, min: formatUSD(d.min_payment_cents) })}</p>
                    <button
                      type="button"
                      className="t-caption link-button"
                      style={{ alignSelf: "start", minHeight: 32, padding: 0 }}
                      onClick={() => {
                        setEditing(d);
                        setNewBalance("");
                      }}
                    >
                      {t("updateBalance")}
                    </button>
                  </div>
                  <span className="t-body num">{formatUSD(d.balance_cents)}</span>
                  <button type="button" className="icon-btn" aria-label={`${t("delete")} ${d.name}`} onClick={() => setDeleting(d)}>
                    <Icon name="trash" size={20} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {adding ? (
        <Card>
          <div className="stack">
            <p className="t-heading">{t("add")}</p>
            <DebtForm onDone={() => setAdding(false)} />
          </div>
        </Card>
      ) : (
        <Button variant="secondary" block onClick={() => setAdding(true)}>
          <Icon name="plus" size={20} />
          {t("add")}
        </Button>
      )}

      <p className="t-caption muted">{t("notAdvice")}</p>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing ? `${t("updateBalance")}: ${editing.name}` : ""}>
        <form className="stack" onSubmit={saveBalance} noValidate>
          <Field label={t("balance")}>
            {(pp) => <MoneyInput {...pp} autoFocus value={newBalance} onChange={(e) => setNewBalance(e.target.value)} />}
          </Field>
          <div className="field-row">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {c("cancel")}
            </Button>
            <Button type="submit">{c("save")}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)} title={deleting ? t("deleteConfirm", { name: deleting.name }) : ""}>
        <div className="field-row">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            {c("cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              const d = deleting;
              setDeleting(null);
              if (d) await mutate((s) => s.deleteDebt(d.id)).catch(() => {});
            }}
          >
            {t("delete")}
          </Button>
        </div>
      </Dialog>
    </main>
  );
}
