"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useData } from "@/components/DataProvider";
import { Button, Field, Input, Toast } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { EXPENSE_CATEGORIES } from "@/lib/budget";
import { todayISO } from "@/lib/dates";
import { hasPlus } from "@/lib/plan";
import { QuickLog } from "@/components/QuickLog";
import { PlusCard } from "@/components/Plus";
import type { ParsedEntry } from "@/lib/quick-log";
import { centsToInput, currencySymbol, formatUSD, parseCents } from "@/lib/money";
import { BUSINESS_CATEGORIES, canBeBusiness } from "@/lib/business";
import { SwitchRow } from "@/components/VetNav";
import type { EntryType, NewEntry } from "@/lib/types";

const CAT_ICONS: Record<(typeof EXPENSE_CATEGORIES)[number], IconName> = {
  food: "utensils",
  transport: "car",
  home: "home",
  health: "activity",
  phone: "phone",
  kids: "smile",
  fun: "music",
  other: "more",
};

const BIZ_ICONS: Record<(typeof BUSINESS_CATEGORIES)[number], IconName> = {
  supplies: "box",
  equipment: "tool",
  transport: "car",
  phone: "phone",
  marketing: "trending",
  fees: "percent",
  other: "more",
};

export default function AddEntry() {
  const t = useTranslations("add");
  const c = useTranslations("common");
  const cat = useTranslations("add.categories");
  const q = useTranslations("quicklog");
  const bz = useTranslations("business");
  const { recipients, bills, goals, profile, subscription, mutate } = useData();
  const router = useRouter();
  // Paycheck mode (Plus) adds "I got paid".
  const payMode = hasPlus(subscription) && Boolean(profile?.pay_frequency);
  // Business mode adds income (business pay) and the "For my business" switch.
  const businessOn = Boolean(profile?.business_on);

  const [type, setType] = useState<EntryType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("food");
  const [recipientId, setRecipientId] = useState(recipients[0]?.id ?? "");
  const [billId, setBillId] = useState(bills[0]?.id ?? "");
  const [goalId, setGoalId] = useState(goals[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [business, setBusiness] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  // The bill reminder email links here with ?type=bill_paid&bill=<id>; Sends with ?type=send&to=<id>.
  const params = useSearchParams();
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    // Business page links here with ?business=1&type=income|expense.
    if (params.get("business") === "1" && businessOn) {
      const tp = params.get("type") === "income" ? "income" : "expense";
      setType(tp);
      setBusiness(true);
      if (tp === "expense") setCategory("supplies");
      return;
    }
    if (params.get("type") === "income" && (payMode || businessOn)) {
      setType("income");
      return;
    }
    const toParam = params.get("to");
    if (params.get("type") === "send" && toParam && recipients.some((r) => r.id === toParam)) {
      setType("send");
      pickRecipient(toParam);
      return;
    }
    const billParam = params.get("bill");
    if (params.get("type") === "bill_paid" && billParam && bills.some((b) => b.id === billParam)) {
      setType("bill_paid");
      pickBill(billParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick log's "Fix it": load what was read into the form below to adjust by hand.
  function fillForm(e: ParsedEntry) {
    setType(e.type);
    setAmount(centsToInput(e.amount_cents));
    setDate(e.date);
    setNote(e.note ?? "");
    if (e.type === "expense") setCategory(e.category);
    setBusiness(false);
    if (e.type === "send" && e.match_id) setRecipientId(e.match_id);
    if (e.type === "bill_paid" && e.match_id) setBillId(e.match_id);
    if (e.type === "savings" && e.match_id) setGoalId(e.match_id);
    setFormError(null);
    setAmountError(null);
  }

  function quickSaved(saved: ParsedEntry[]) {
    if (saved.some((e) => e.type === "income") && payMode) {
      router.push("/app");
      return;
    }
    setToast(q("saved", { count: saved.length }));
  }

  // Picking a bill or a person fills in its usual amount.
  function pickRecipient(id: string) {
    setRecipientId(id);
    const r = recipients.find((x) => x.id === id);
    if (r) setAmount(centsToInput(r.default_amount_cents));
  }
  function pickBill(id: string) {
    setBillId(id);
    const b = bills.find((x) => x.id === id);
    if (b) {
      setAmount(centsToInput(b.amount_cents));
      setNote(b.name);
    }
  }
  function toggleBusiness(on: boolean) {
    setBusiness(on);
    // Business costs have their own categories (supplies, equipment…).
    if (on && !(BUSINESS_CATEGORIES as readonly string[]).includes(category)) setCategory("supplies");
    if (!on && !(EXPENSE_CATEGORIES as readonly string[]).includes(category)) setCategory("food");
  }

  function changeType(next: EntryType) {
    setType(next);
    setFormError(null);
    if (next === "send" && recipients[0]) pickRecipient(recipientId || recipients[0].id);
    else if (next === "bill_paid" && bills[0]) pickBill(billId || bills[0].id);
    else if (next === "expense" || next === "savings" || next === "income") {
      setAmount("");
      setNote("");
    }
  }

  async function save(entry: NewEntry, goal?: string) {
    setBusy(true);
    setFormError(null);
    try {
      await mutate(async (s) => {
        await s.addEntry(entry);
        if (goal) await s.addToGoal(goal, entry.amount_cents);
      });
      // A new paycheck changes the number on Home, so show it right away.
      if (entry.type === "income" && !entry.business) {
        router.push("/app");
        return;
      }
      setToast(t("saved", { amount: formatUSD(entry.amount_cents) }));
      setAmount("");
      setNote("");
    } catch {
      setFormError(c("somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const cents = parseCents(amount);
    if (!cents) {
      setAmountError(c("amountInvalid"));
      return;
    }
    setAmountError(null);
    const biz = businessOn && business && canBeBusiness(type) ? { business: true } : {};
    const base = { amount_cents: cents, date, note: note.trim() || null, recipient_id: null, ...biz };
    if (type === "expense") save({ ...base, type, category });
    if (type === "send") {
      const r = recipients.find((x) => x.id === recipientId);
      save({ ...base, type, category: "family", recipient_id: recipientId, note: base.note ?? r?.name ?? null });
    }
    if (type === "bill_paid") save({ ...base, type, category: "bills" });
    if (type === "income") save({ ...base, type, category: "income" });
    if (type === "savings") {
      const g = goals.find((x) => x.id === goalId);
      save({ ...base, type, category: "savings", note: base.note ?? g?.name ?? null }, goalId);
    }
  }

  const blocked =
    (type === "send" && recipients.length === 0 && t("noRecipients")) ||
    (type === "bill_paid" && bills.length === 0 && t("noBills")) ||
    (type === "savings" && goals.length === 0 && t("noGoals")) ||
    null;

  const types: { value: EntryType; label: string; icon: IconName; tone: string }[] = [
    { value: "expense", label: t("typeExpense"), icon: "list", tone: "clara" },
    { value: "send", label: t("typeSend"), icon: "send", tone: "mango" },
    { value: "bill_paid", label: t("typeBill"), icon: "calendar", tone: "clara" },
    { value: "savings", label: t("typeSavings"), icon: "target", tone: "positive" },
    ...(payMode || businessOn ? [{ value: "income" as const, label: t("typeIncome"), icon: "wallet" as const, tone: "positive" }] : []),
  ];

  return (
    <main className="page log-page">
      <header className="stack-sm">
        <h1 className="t-title">{t("title")}</h1>
        <p className="t-body muted">{t("lead")}</p>
      </header>

      {hasPlus(subscription) && (
        <>
          <QuickLog onEdit={fillForm} onSaved={quickSaved} />
          <p className="t-label muted">{q("orByHand")}</p>
        </>
      )}

      <div className="type-grid" role="radiogroup" aria-label={t("kind")} style={{ gridTemplateColumns: `repeat(${types.length}, 1fr)` }}>
        {types.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={type === o.value}
            className={type === o.value ? "type-tile type-tile--on" : "type-tile"}
            onClick={() => changeType(o.value)}
          >
            <span className={`row-icon row-icon--${o.tone}`} aria-hidden>
              <Icon name={o.icon} size={18} />
            </span>
            {o.label}
          </button>
        ))}
      </div>

      {blocked ? (
        <p className="notice t-body">{blocked}</p>
      ) : (
        <form className="stack" onSubmit={submit} noValidate>
          <div className={amountError ? "amount-hero amount-hero--error" : "amount-hero"}>
            <label htmlFor="log-amount" className="amount-hero__label">
              {c("amount")}
            </label>
            <div className="amount-hero__row">
              <span className="amount-hero__dollar" aria-hidden>
                {currencySymbol()}
              </span>
              <input
                id="log-amount"
                className="amount-hero__input"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amount}
                style={{ width: `${Math.max(4, amount.length) + 0.5}ch` }}
                aria-invalid={amountError ? true : undefined}
                aria-describedby={amountError ? "log-amount-error" : undefined}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {amountError && (
              <p id="log-amount-error" className="field__error">
                {amountError}
              </p>
            )}
          </div>

          {businessOn && canBeBusiness(type) && (
            <div className={business ? "card biz-switch biz-switch--on" : "card biz-switch"}>
              <span className="row-icon row-icon--positive" aria-hidden>
                <Icon name="briefcase" size={18} />
              </span>
              <SwitchRow label={bz("forBusiness")} help={bz("forBusinessHelp")} checked={business} onChange={toggleBusiness} />
            </div>
          )}

          {type === "expense" && (
            <fieldset className="pick">
              <legend className="field__label">{t("category")}</legend>
              <div className="cat-grid">
                {(business && businessOn ? BUSINESS_CATEGORIES : EXPENSE_CATEGORIES).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={category === k ? "cat-btn cat-btn--on" : "cat-btn"}
                    aria-pressed={category === k}
                    onClick={() => setCategory(k)}
                  >
                    <span className="cat-btn__icon" aria-hidden>
                      <Icon name={business && businessOn ? BIZ_ICONS[k as keyof typeof BIZ_ICONS] : CAT_ICONS[k as keyof typeof CAT_ICONS]} size={22} />
                    </span>
                    {cat(k)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {type === "send" && (
            <fieldset className="pick">
              <legend className="field__label">{t("recipient")}</legend>
              <div className="pick-row">
                {recipients.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={recipientId === r.id ? "pick-chip pick-chip--on" : "pick-chip"}
                    aria-pressed={recipientId === r.id}
                    onClick={() => pickRecipient(r.id)}
                  >
                    <span className="pick-chip__avatar" aria-hidden>
                      {r.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span>
                      {r.name}
                      <span className="pick-chip__sub num">{formatUSD(r.default_amount_cents)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {type === "bill_paid" && (
            <fieldset className="pick">
              <legend className="field__label">{t("bill")}</legend>
              <div className="pick-row">
                {bills.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={billId === b.id ? "pick-chip pick-chip--on" : "pick-chip"}
                    aria-pressed={billId === b.id}
                    onClick={() => pickBill(b.id)}
                  >
                    <span>
                      {b.name}
                      <span className="pick-chip__sub num">{formatUSD(b.amount_cents)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {type === "savings" && (
            <fieldset className="pick">
              <legend className="field__label">{t("goal")}</legend>
              <div className="pick-row">
                {goals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={goalId === g.id ? "pick-chip pick-chip--on" : "pick-chip"}
                    aria-pressed={goalId === g.id}
                    onClick={() => setGoalId(g.id)}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="card log-details">
            <Field label={t("date")}>
              {(p) => <Input {...p} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
            </Field>
            <Field label={t("note")}>
              {(p) => <Input {...p} value={note} placeholder={t("notePlaceholder")} onChange={(e) => setNote(e.target.value)} />}
            </Field>
          </div>

          {formError && (
            <p className="notice notice--alerta t-caption" role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" block disabled={busy} className="log-save">
            <Icon name="check" size={20} />
            {busy ? c("saving") : t("save")}
          </Button>
        </form>
      )}

      {!hasPlus(subscription) && <PlusCard feature="quicklog" title={q("plusTitle")} />}

      <Toast message={toast} onDone={clearToast} />
    </main>
  );
}
