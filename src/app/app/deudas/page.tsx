"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/components/Icon";
import { PlusPreview } from "@/components/Plus";
import { Button, Card, Dialog, Field, Input, MoneyInput, Segmented } from "@/components/ui";
import { Ring } from "@/components/HomeHero";
import { monthFromNow, progress, simulate, type PayoffPlan } from "@/lib/debts";
import { monthName } from "@/lib/forecast";
import { formatUSD, localizeDollars, parseCents } from "@/lib/money";
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
      <Button type="submit" block disabled={busy}>
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
  const [adding, setAdding] = useState(false);
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

  const best = avalanche.months !== null && snowball.months !== null && snowball.interest < avalanche.interest ? "snowball" : "avalanche";
  // Only call one plan out when it really costs less.
  const tie = avalanche.months !== null && snowball.months !== null && avalanche.interest === snowball.interest && avalanche.months === snowball.months;
  const planCard = (plan: PayoffPlan, key: "avalanche" | "snowball") => (
    <div className={best === key && !tie && plan.months !== null ? "plan-tile plan-tile--best" : "plan-tile"}>
      {best === key && !tie && plan.months !== null && <span className="plan-tile__badge">{t("leastInterest")}</span>}
      <p className="t-label">{t(`${key}Short`)}</p>
      <p className="t-caption muted">{t(`${key}Why`)}</p>
      {plan.months === null ? (
        <p className="t-caption tone-alerta">{t("never")}</p>
      ) : (
        <>
          <p className="plan-tile__date">{when(plan)}</p>
          <p className="t-caption muted">{t("months", { months: plan.months })}</p>
          <p className="t-caption">{t("interest", { amount: formatUSD(plan.interest) })}</p>
          {minimum.months !== null && minimum.interest > plan.interest && (
            <p className="t-caption tone-positive">{t("savesShort", { amount: formatUSD(minimum.interest - plan.interest) })}</p>
          )}
        </>
      )}
    </div>
  );
  const orderOf = (plan: PayoffPlan) =>
    [...plan.debts]
      .filter((d) => d.paidOffMonth !== null)
      .sort((x, y) => x.paidOffMonth! - y.paidOffMonth!)
      .map((d) => d.name)
      .join(" → ");

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

  const TONES = ["clara", "violet", "mango"] as const;

  return (
    <main className="page">
      <header className="row row--between" style={{ alignItems: "flex-start" }}>
        <div className="stack-sm">
          <h1 className="t-title">{t("title")}</h1>
          <p className="t-body muted">{t("lead")}</p>
        </div>
        <button type="button" className="pill-btn" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} />
          {t("addShort")}
        </button>
      </header>

      {open.length > 0 && (
        <section className="hero-card" aria-label={t("owe")}>
          <span className="hero-card__sparkles" aria-hidden />
          <div className="hero-card__main">
            <p className="hero-card__label">
              <Icon name="wallet" size={18} />
              {t("owe")}
            </p>
            <p className={["hero-card__big", formatUSD(p.now).length > 8 && (formatUSD(p.now).length > 10 ? "hero-card__big--xlong" : "hero-card__big--long")].filter(Boolean).join(" ")}>
              {formatUSD(p.now)}
            </p>
            {minimum.months === null ? (
              <p className="hero-card__status hero-card__status--over">{t("neverShort")}</p>
            ) : (
              <p className="hero-card__plain">
                <span className="muted">{t("minTitle")}</span>
                <br />
                {t("debtFree", { date: when(minimum)! })} · {t("interest", { amount: formatUSD(minimum.interest) })}
              </p>
            )}
            {(best === "avalanche" ? avalanche : snowball).months !== null && (
              <div className="hero-card__foot">
                <p className="hero-card__status hero-card__status--ok">
                  {t("rollTitle")}: {t("debtFree", { date: when(best === "avalanche" ? avalanche : snowball)! })}
                </p>
              </div>
            )}
          </div>
          {plus && p.start > 0 && (
            <div className="hero-card__side">
              <span />
              <Ring value={p.share} label={t("ringLabel")} aria={t("ringAria", { pct: Math.round(p.share * 100) })} />
            </div>
          )}
        </section>
      )}

      {plus && open.length > 0 && p.start > 0 && (
        <p className="t-body">
          {t("progressLine", { paid: formatUSD(p.paid), start: formatUSD(p.start) })}
          {p.paidOff > 0 ? ` · ${t("paidOffCount", { count: p.paidOff })}` : ""}
          {avalanche.months !== null ? ` · ${t("countdown", { months: avalanche.months })}` : ""}
        </p>
      )}

      {debts.length === 0 ? (
        <button type="button" className="card add-card" onClick={() => setAdding(true)}>
          <span className="grow stack-sm">
            <span className="t-heading">{t("emptyTitle")}</span>
            <span className="t-caption add-card__lead">{t("emptyLead")}</span>
          </span>
          <span className="add-card__plus" aria-hidden>
            <Icon name="plus" />
          </span>
        </button>
      ) : (
        <section className="stack-sm">
          <h2 className="t-heading">{t("yourDebts")}</h2>
          {debts.map((d, i) => {
            const start = Math.max(d.start_balance_cents, d.balance_cents);
            const share = start > 0 ? (start - d.balance_cents) / start : 0;
            const done = d.balance_cents === 0;
            const tone = done ? "positive" : TONES[i % TONES.length];
            return (
              <article key={d.id} className="card goal-card">
                <div className="row">
                  <span className={`goal-icon goal-icon--${tone === "mango" ? "violet" : tone}`} aria-hidden>
                    <Icon name={done ? "check" : "wallet"} size={22} />
                  </span>
                  <h3 className="t-heading grow">{d.name}</h3>
                  {done && <span className="status-tag status-tag--done">{t("paidOff")} ✓</span>}
                  <details className="menu">
                    <summary className="icon-btn" aria-label={t("options", { name: d.name })}>
                      <Icon name="more" size={22} />
                    </summary>
                    <div className="menu__list">
                      <button type="button" onClick={() => setDeleting(d)}>
                        <Icon name="trash" size={18} />
                        {t("delete")} {d.name}
                      </button>
                    </div>
                  </details>
                </div>
                <div className="row row--between goal-card__numbers">
                  <div>
                    <p className="goal-card__saved num">{formatUSD(d.balance_cents)}</p>
                    <p className="t-caption muted">{t("debtLine", { apr: d.apr, min: formatUSD(d.min_payment_cents) })}</p>
                  </div>
                  {plus && start > 0 && <p className="goal-card__pct num tone-positive">{Math.round(share * 100)}%</p>}
                </div>
                {plus && start > 0 && (
                  <>
                    <span className="bar bar--positive" role="progressbar" aria-label={d.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}>
                      <span style={{ width: `${share * 100}%` }} />
                    </span>
                    <p className="t-caption muted">{t("paidOfStart", { paid: formatUSD(start - d.balance_cents), start: formatUSD(start) })}</p>
                  </>
                )}
                {!done && (
                  <Button
                    variant="secondary"
                    small
                    onClick={() => {
                      setEditing(d);
                      setNewBalance("");
                    }}
                  >
                    {t("updateBalance")}
                  </Button>
                )}
              </article>
            );
          })}
        </section>
      )}

      {open.length > 0 && (
        <section className="stack-sm">
          <div className="stack-sm">
            <h2 className="t-heading">{t("compareTitle")}</h2>
            <p className="t-caption muted">{t("compareLead")}</p>
          </div>
          <div className="plan-grid">
            {planCard(avalanche, "avalanche")}
            {planCard(snowball, "snowball")}
          </div>
          {(best === "avalanche" ? avalanche : snowball).months !== null && (
            <p className="t-caption muted">{t("order", { list: orderOf(best === "avalanche" ? avalanche : snowball) })}</p>
          )}
        </section>
      )}

      {open.length > 0 && <Card>{plus ? whatIf : <PlusPreview feature="debts" label={localizeDollars(t("plusWhatIf"))}>{whatIf}</PlusPreview>}</Card>}

      <Dialog open={adding} onClose={() => setAdding(false)} title={t("add")}>
        <DebtForm onDone={() => setAdding(false)} />
      </Dialog>

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
