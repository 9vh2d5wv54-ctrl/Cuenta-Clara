"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { PlusCard } from "@/components/Plus";
import { Button, Card, Field, Input, MoneyInput, Segmented } from "@/components/ui";
import { monthlySendCents } from "@/lib/budget";
import { formatLongDate } from "@/lib/dates";
import {
  businessTarget,
  carTarget,
  dateInMonths,
  DOWN_PAYMENTS,
  emergencyTarget,
  homeTarget,
  monthlyFor,
  retirePlan,
  type TemplateId,
} from "@/lib/goal-templates";
import { formatUSD, parseCents } from "@/lib/money";
import { canAddGoal } from "@/lib/plan";

const LESSON: Record<Exclude<TemplateId, "debt">, string> = {
  emergency: "fondo-de-emergencia",
  home: "credito",
  car: "apr",
  business: "impuestos-1099",
  retire: "interes-compuesto",
};
const TIMELINES = [12, 24, 36, 60];

// Goal marketplace (free): one template's questions, the plan, and "save as a goal".
export default function GoalPlan() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("goalPlans");
  const pl = useTranslations("plus");
  const locale = useLocale();
  const router = useRouter();
  const { bills, recipients, goals, subscription, mutate } = useData();
  const [price, setPrice] = useState("");
  const [down, setDown] = useState("0.035");
  const [months, setMonths] = useState(id === "emergency" ? 12 : 36);
  const [years, setYears] = useState("25");
  const [busy, setBusy] = useState(false);

  if (!["emergency", "home", "car", "business", "retire"].includes(id)) notFound();
  const tid = id as Exclude<TemplateId, "debt">;

  const fixed = bills.reduce((s, b) => s + b.amount_cents, 0) + recipients.reduce((s, r) => s + monthlySendCents(r), 0);
  const amount = parseCents(price) ?? 0;
  const yearsN = Math.max(1, Math.min(50, Math.floor(Number(years) || 0)));

  let target = 0;
  let breakdown = "";
  let monthly = 0;
  let date = dateInMonths(months);
  if (tid === "emergency") {
    target = emergencyTarget(fixed);
    breakdown = fixed > 0 ? t("emergencyBreakdown", { fixed: formatUSD(fixed) }) : t("needsBills");
  } else if (tid === "home") {
    const h = homeTarget(amount, Number(down));
    target = h.total;
    breakdown = t("homeBreakdown", { down: formatUSD(h.down), closing: formatUSD(h.closing) });
  } else if (tid === "car") {
    target = carTarget(amount);
    breakdown = t("carBreakdown", { price: formatUSD(amount) });
  } else if (tid === "business") {
    target = businessTarget(amount, fixed);
    breakdown = t("businessBreakdown", { startup: formatUSD(amount), fixed3: formatUSD(fixed * 3) });
  } else {
    const r = retirePlan(amount, yearsN);
    target = r.target;
    monthly = r.monthly;
    date = dateInMonths(yearsN * 12);
    breakdown = t("retireBreakdown", { year: formatUSD(amount * 12), monthly: formatUSD(r.monthly), years: yearsN });
  }
  if (tid !== "retire") monthly = monthlyFor(target, months);
  const steps = t.raw(`steps_${tid}`) as string[];
  const canSave = target > 0 && canAddGoal(subscription, goals);

  async function save() {
    setBusy(true);
    try {
      await mutate((s) => s.addGoal({ name: t(`goalName_${tid}`), target_cents: target, target_date: date }));
      router.push("/app/metas");
    } catch {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="stack-sm">
        <Link href="/app/metas" className="t-label">
          ← {t("viewGoals")}
        </Link>
        <h1 className="t-title">{t(`${tid}_title`)}</h1>
        <p className="t-body muted">{t(`${tid}_lead`)}</p>
      </div>

      <Card>
        <div className="stack">
          {(tid === "home" || tid === "car" || tid === "business" || tid === "retire") && (
            <Field label={t(tid === "home" ? "price" : tid === "car" ? "carPrice" : tid === "business" ? "startup" : "spending")}>
              {(p) => <MoneyInput big {...p} value={price} onChange={(e) => setPrice(e.target.value)} />}
            </Field>
          )}
          {tid === "home" && (
            <div className="field">
              <span className="field__label">{t("down")}</span>
              <Segmented
                label={t("down")}
                value={down}
                onChange={setDown}
                options={DOWN_PAYMENTS.map((d) => ({ value: String(d), label: d === 0 ? t("downVA") : `${Math.round(d * 1000) / 10}%` }))}
              />
            </div>
          )}
          {tid === "retire" ? (
            <Field label={t("years")}>
              {(p) => <Input {...p} type="number" inputMode="numeric" min={1} value={years} onChange={(e) => setYears(e.target.value)} />}
            </Field>
          ) : (
            <div className="field">
              <span className="field__label">{t("when")}</span>
              <Segmented
                label={t("when")}
                value={String(months)}
                onChange={(v) => setMonths(Number(v))}
                options={TIMELINES.map((n) => ({ value: String(n), label: t("months", { n }) }))}
              />
            </div>
          )}
        </div>
      </Card>

      {target > 0 && (
        <Card className="hero">
          <p className="t-label muted">{t("planTitle")}</p>
          <p className="t-money-xl hero__figure">{formatUSD(monthly)}</p>
          <p className="t-body">
            {t("monthly", { amount: formatUSD(monthly) })} · {t("target", { amount: formatUSD(target) })} ·{" "}
            {t("by", { date: formatLongDate(date, locale) })}
          </p>
          <p className="t-caption muted">{breakdown}</p>
        </Card>
      )}
      {target === 0 && breakdown && <p className="notice t-body">{breakdown}</p>}

      <Card>
        <div className="stack-sm">
          <p className="t-heading">{t("stepsTitle")}</p>
          <ol className="t-body stack-sm" style={{ margin: 0, paddingInlineStart: 20 }}>
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <Link href={`/aprende/${LESSON[tid]}`} className="t-label">
            {t("lesson")} →
          </Link>
        </div>
      </Card>

      {target > 0 &&
        (canSave ? (
          <Button block onClick={save} disabled={busy}>
            {t("save")}
          </Button>
        ) : (
          <PlusCard feature="goals" title={pl("goalsTitle")} />
        ))}

      <p className="t-caption muted">{t("assumptions")}</p>
    </main>
  );
}
