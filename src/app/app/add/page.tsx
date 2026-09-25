"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useData } from "@/components/DataProvider";
import { Button, Field, Input, MoneyInput, Segmented, Select, Toast } from "@/components/ui";
import { EXPENSE_CATEGORIES } from "@/lib/budget";
import { todayISO } from "@/lib/dates";
import { centsToInput, formatUSD, parseCents } from "@/lib/money";
import type { EntryType, NewEntry } from "@/lib/types";

export default function AddEntry() {
  const t = useTranslations("add");
  const c = useTranslations("common");
  const cat = useTranslations("add.categories");
  const { recipients, bills, goals, mutate } = useData();

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
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  // The bill reminder email links here with ?type=bill_paid&bill=<id>.
  const params = useSearchParams();
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    const billParam = params.get("bill");
    if (params.get("type") === "bill_paid" && billParam && bills.some((b) => b.id === billParam)) {
      setType("bill_paid");
      pickBill(billParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  function changeType(next: EntryType) {
    setType(next);
    setFormError(null);
    if (next === "send" && recipients[0]) pickRecipient(recipientId || recipients[0].id);
    else if (next === "bill_paid" && bills[0]) pickBill(billId || bills[0].id);
    else if (next === "expense" || next === "savings") {
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
    const base = { amount_cents: cents, date, note: note.trim() || null, recipient_id: null };
    if (type === "expense") save({ ...base, type, category });
    if (type === "send") {
      const r = recipients.find((x) => x.id === recipientId);
      save({ ...base, type, category: "family", recipient_id: recipientId, note: base.note ?? r?.name ?? null });
    }
    if (type === "bill_paid") save({ ...base, type, category: "bills" });
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

  return (
    <main className="page">
      <h1 className="t-title">{t("title")}</h1>

      <Segmented
        label={t("title")}
        value={type}
        onChange={changeType}
        options={[
          { value: "expense", label: t("typeExpense") },
          { value: "send", label: t("typeSend") },
          { value: "bill_paid", label: t("typeBill") },
          { value: "savings", label: t("typeSavings") },
        ]}
      />

      {type === "send" && recipients.length > 0 && (
        <div className="stack-sm">
          <p className="t-label">{t("presets")}</p>
          <div className="chips">
            {recipients.map((r) => (
              <button
                key={r.id}
                type="button"
                className="chip chip--mango"
                disabled={busy}
                onClick={() =>
                  save({
                    type: "send",
                    amount_cents: r.default_amount_cents,
                    category: "family",
                    recipient_id: r.id,
                    date: todayISO(),
                    note: r.name,
                  })
                }
              >
                {r.name} · <span className="num">{formatUSD(r.default_amount_cents)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {blocked ? (
        <p className="notice t-body">{blocked}</p>
      ) : (
        <form className="stack" onSubmit={submit} noValidate>
          <Field label={c("amount")} error={amountError}>
            {(p) => <MoneyInput big {...p} value={amount} onChange={(e) => setAmount(e.target.value)} />}
          </Field>

          {type === "expense" && (
            <div className="field">
              <span className="field__label">{t("category")}</span>
              <Segmented
                label={t("category")}
                value={category}
                onChange={setCategory}
                options={EXPENSE_CATEGORIES.map((k) => ({ value: k, label: cat(k) }))}
              />
            </div>
          )}

          {type === "send" && (
            <Field label={t("recipient")}>
              {(p) => (
                <Select {...p} value={recipientId} onChange={(e) => pickRecipient(e.target.value)}>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          {type === "bill_paid" && (
            <Field label={t("bill")}>
              {(p) => (
                <Select {...p} value={billId} onChange={(e) => pickBill(e.target.value)}>
                  {bills.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          {type === "savings" && (
            <Field label={t("goal")}>
              {(p) => (
                <Select {...p} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          <Field label={t("date")}>
            {(p) => <Input {...p} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <Field label={t("note")}>
            {(p) => (
              <Input {...p} value={note} placeholder={t("notePlaceholder")} onChange={(e) => setNote(e.target.value)} />
            )}
          </Field>

          {formError && (
            <p className="notice notice--alerta t-caption" role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" block disabled={busy}>
            {busy ? c("saving") : t("save")}
          </Button>
        </form>
      )}

      <Toast message={toast} onDone={clearToast} />
    </main>
  );
}
