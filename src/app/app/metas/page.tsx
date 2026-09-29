"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { useData } from "@/components/DataProvider";
import { GoalForm } from "@/components/forms";
import { PlusCard } from "@/components/Plus";
import { canAddGoal } from "@/lib/plan";
import { Icon } from "@/components/Icon";
import { Button, Card, Dialog, Explain, Field, MoneyInput, Segmented } from "@/components/ui";
import { goalMonthlyCents } from "@/lib/budget";
import { todayISO } from "@/lib/dates";
import { goalLook, milestone, monthsLeft } from "@/lib/goal-look";
import { formatUSD, parseCents } from "@/lib/money";
import type { Goal } from "@/lib/types";
import { TEMPLATES } from "@/lib/goal-templates";

export default function Metas() {
  const t = useTranslations("goals");
  const d = useTranslations("debts");
  const v = useTranslations("veterans");
  const gp = useTranslations("goalPlans");
  const c = useTranslations("common");
  const x = useTranslations("explain");
  const locale = useLocale();
  const { goals, subscription, mutate } = useData();
  const p = useTranslations("plus");
  const [adding, setAdding] = useState<Goal | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "done">("active");
  const [creating, setCreating] = useState(false);

  function openAdd(g: Goal) {
    setAdding(g);
    setAmount("");
    setError(null);
  }

  async function saveMoney(e: FormEvent) {
    e.preventDefault();
    const cents = parseCents(amount);
    if (!cents || !adding) {
      setError(c("amountInvalid"));
      return;
    }
    try {
      const goal = adding;
      await mutate(async (s) => {
        await s.addEntry({
          type: "savings",
          amount_cents: cents,
          category: "savings",
          recipient_id: null,
          date: todayISO(),
          note: goal.name,
        });
        await s.addToGoal(goal.id, cents);
      });
      setAdding(null);
    } catch {
      setError(c("somethingWrong"));
    }
  }

  const isDone = (g: Goal) => g.saved_cents >= g.target_cents;
  const shown = goals.map((g, i) => ({ g, i })).filter(({ g }) => (tab === "done" ? isDone(g) : !isDone(g)));
  const doneCount = goals.filter(isDone).length;
  const canAdd = canAddGoal(subscription, goals);
  const monthYear = (iso: string) => {
    const [y, m] = iso.split("-").map(Number);
    const s = new Date(y, m - 1, 1).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "short", year: "numeric" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <main className="page">
      <header className="row row--between">
        <h1 className="t-title">{t("title")}</h1>
        <button type="button" className="pill-btn" onClick={() => setCreating(true)}>
          <Icon name="plus" size={18} />
          {t("new")}
        </button>
      </header>

      <Segmented
        label={t("title")}
        value={tab}
        onChange={setTab}
        options={[
          { value: "active", label: t("active") },
          { value: "done", label: t("completed") },
        ]}
      />

      {shown.length === 0 && (
        <p className="t-body muted">{goals.length === 0 ? t("empty") : tab === "done" ? t("noneDone") : t("allDone")}</p>
      )}

      {shown.map(({ g, i }) => {
        const done = isDone(g);
        const monthly = goalMonthlyCents(g);
        const pct = g.target_cents > 0 ? Math.min(1, g.saved_cents / g.target_cents) : 0;
        const { icon, tone } = goalLook(g.name, i);
        const cheer = milestone(pct);
        const months = monthsLeft(g.target_date);
        return (
          <article key={g.id} className="card goal-card">
            <div className="row">
              <span className={`goal-icon goal-icon--${tone}`} aria-hidden>
                <Icon name={done ? "check" : icon} size={22} />
              </span>
              <h2 className="t-heading grow">{g.name}</h2>
              <details className="menu">
                <summary className="icon-btn" aria-label={t("options", { name: g.name })}>
                  <Icon name="more" size={22} />
                </summary>
                <div className="menu__list">
                  <button type="button" onClick={() => mutate((s) => s.deleteGoal(g.id)).catch(() => {})}>
                    <Icon name="trash" size={18} />
                    {t("remove", { name: g.name })}
                  </button>
                </div>
              </details>
            </div>
            <div className="row row--between goal-card__numbers">
              <div>
                <p className={`goal-card__saved num tone-${tone}`}>{formatUSD(g.saved_cents)}</p>
                <p className="t-caption muted num">
                  {t("of")} {formatUSD(g.target_cents)}
                </p>
              </div>
              <p className={`goal-card__pct num tone-${tone}`}>{Math.round(pct * 100)}%</p>
            </div>
            <span className={`bar bar--${tone}`} role="progressbar" aria-label={g.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)}>
              <span style={{ width: `${pct * 100}%` }} />
            </span>
            <div className="row row--between t-caption muted goal-card__foot">
              <span>{t("target", { date: monthYear(g.target_date) })}</span>
              <span className="row" style={{ gap: 6 }}>
                <Icon name="calendar" size={16} />
                {done ? t("reachedShort") : months === 0 ? t("thisMonth") : t("inMonths", { n: months })}
              </span>
            </div>
            {done ? (
              <p className="t-body tone-positive">{t("reached")}</p>
            ) : (
              <>
                {cheer && <p className={`cheer tone-${tone}`}>{t(`cheer_${cheer}`)}</p>}
                <p className="t-body">{t("needed", { amount: formatUSD(monthly) })}</p>
                <Explain text={x("goalMonthly")} />
                <Button variant="secondary" small onClick={() => openAdd(g)}>
                  {t("addMoney")}
                </Button>
              </>
            )}
          </article>
        );
      })}

      {doneCount > 0 && (
        <div className="card win-card">
          <div className="grow stack-sm">
            <p className="t-heading">{t("winTitle")}</p>
            <p className="t-body muted">{t("winLead", { n: doneCount })}</p>
          </div>
          <span className="win-card__badge" aria-hidden>
            <Icon name="trophy" size={30} />
          </span>
        </div>
      )}

      <Link href="/app/deudas" className="card row" style={{ textDecoration: "none" }}>
        <Icon name="target" />
        <span className="t-label grow">{d("goalsLink")}</span>
        <Icon name="forward" size={20} />
      </Link>
      <Link href="/app/veteranos" className="card row" style={{ textDecoration: "none" }}>
        <Icon name="heart" />
        <span className="t-label grow">{v("goalsLink")}</span>
        <Icon name="forward" size={20} />
      </Link>

      <section className="stack-sm">
        <h2 className="t-heading">{gp("exploreTitle")}</h2>
        <div className="goal-grid">
          {TEMPLATES.map((id) => (
            <Link
              key={id}
              href={id === "debt" ? "/app/deudas" : `/app/metas/plan/${id}`}
              className="card stack-sm"
              style={{ textDecoration: "none" }}
            >
              <span className="t-label">{gp(`${id}_title`)}</span>
              <span className="t-caption muted">{gp(`${id}_lead`)}</span>
            </Link>
          ))}
        </div>
      </section>

      <Dialog open={creating} onClose={() => setCreating(false)} title={t("addTitle")}>
        {canAdd ? (
          <GoalForm
            submitLabel={c("add")}
            onSave={async (g) => {
              await mutate((s) => s.addGoal(g));
              setCreating(false);
              setTab("active");
            }}
          />
        ) : (
          <PlusCard feature="goals" title={p("goalsTitle")} />
        )}
      </Dialog>

      <Dialog
        open={adding !== null}
        onClose={() => setAdding(null)}
        title={adding ? t("addMoneyTitle", { name: adding.name }) : ""}
      >
        <form className="stack" onSubmit={saveMoney} noValidate>
          <Field label={c("amount")} error={error}>
            {(p) => <MoneyInput big {...p} value={amount} autoFocus onChange={(e) => setAmount(e.target.value)} />}
          </Field>
          <div className="field-row">
            <Button variant="secondary" onClick={() => setAdding(null)}>
              {c("cancel")}
            </Button>
            <Button type="submit">{c("save")}</Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
