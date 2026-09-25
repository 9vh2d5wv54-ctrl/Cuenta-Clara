"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { useData } from "@/components/DataProvider";
import { GoalForm } from "@/components/forms";
import { PlusCard } from "@/components/Plus";
import { canAddGoal } from "@/lib/plan";
import { Icon } from "@/components/Icon";
import { Button, Card, Dialog, Explain, Field, MoneyInput, ProgressBar } from "@/components/ui";
import { goalMonthlyCents } from "@/lib/budget";
import { formatLongDate, todayISO } from "@/lib/dates";
import { formatUSD, parseCents } from "@/lib/money";
import type { Goal } from "@/lib/types";

export default function Metas() {
  const t = useTranslations("goals");
  const c = useTranslations("common");
  const x = useTranslations("explain");
  const locale = useLocale();
  const { goals, subscription, mutate } = useData();
  const p = useTranslations("plus");
  const [adding, setAdding] = useState<Goal | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="page">
      <h1 className="t-title">{t("title")}</h1>

      {goals.length === 0 && <p className="t-body muted">{t("empty")}</p>}

      {goals.map((g) => {
        const done = g.saved_cents >= g.target_cents;
        const monthly = goalMonthlyCents(g);
        return (
          <Card key={g.id} tone={done ? "clara" : undefined}>
            <div className="stack-sm">
              <div className="row row--between">
                <h2 className="t-heading">{g.name}</h2>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t("remove", { name: g.name })}
                  onClick={() => mutate((s) => s.deleteGoal(g.id)).catch(() => {})}
                >
                  <Icon name="trash" size={20} />
                </button>
              </div>
              <p className="t-body num">
                {t("saved", { saved: formatUSD(g.saved_cents), target: formatUSD(g.target_cents) })}
              </p>
              <ProgressBar value={g.saved_cents / g.target_cents} tone="mango" label={g.name} />
              <p className="t-caption muted">{t("by", { date: formatLongDate(g.target_date, locale) })}</p>
              {done ? (
                <p className="t-body" style={{ color: "var(--clara)" }}>
                  {t("reached")}
                </p>
              ) : (
                <>
                  <p className="t-body">{t("needed", { amount: formatUSD(monthly) })}</p>
                  <Explain text={x("goalMonthly")} />
                  <Button variant="secondary" small onClick={() => openAdd(g)}>
                    {t("addMoney")}
                  </Button>
                </>
              )}
            </div>
          </Card>
        );
      })}

      <section className="stack-sm">
        <h2 className="t-heading">{t("addTitle")}</h2>
        {canAddGoal(subscription, goals) ? (
          <Card>
            <GoalForm submitLabel={c("add")} onSave={(g) => mutate((s) => s.addGoal(g))} />
          </Card>
        ) : (
          <PlusCard feature="goals" title={p("goalsTitle")} />
        )}
      </section>

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
