"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { COUNTRIES, countryByCode } from "@/lib/currencies";
import { parseCents } from "@/lib/money";
import type { Frequency, NewBill, NewGoal, NewRecipient } from "@/lib/types";
import { Button, Field, Input, MoneyInput, Segmented, Select } from "./ui";

// Small add-forms shared by the setup wizard and the Envíos, Metas and Ajustes screens.
// Each validates, calls onSave, and clears itself on success.

type SaveFn<T> = (value: T) => Promise<void>;

function useSubmit() {
  const c = useTranslations("common");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError(c("somethingWrong"));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

export function BillForm({ onSave, submitLabel }: { onSave: SaveFn<NewBill>; submitLabel: string }) {
  const t = useTranslations("setup");
  const c = useTranslations("common");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("1");
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});
  const { busy, error, run } = useSubmit();

  function submit(e: FormEvent) {
    e.preventDefault();
    const cents = parseCents(amount);
    const next = { name: name.trim() ? undefined : c("nameRequired"), amount: cents ? undefined : c("amountInvalid") };
    setErrors(next);
    if (next.name || next.amount || !cents) return;
    run(async () => {
      await onSave({ name: name.trim(), amount_cents: cents, due_day: Number(day), reminder_on: true });
      setName("");
      setAmount("");
    });
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <Field label={t("billName")} error={errors.name}>
        {(p) => <Input {...p} value={name} placeholder={t("billNamePlaceholder")} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <div className="field-row">
        <Field label={c("amount")} error={errors.amount}>
          {(p) => <MoneyInput {...p} value={amount} onChange={(e) => setAmount(e.target.value)} />}
        </Field>
        <Field label={t("dueDay")}>
          {(p) => (
            <Select {...p} value={day} onChange={(e) => setDay(e.target.value)}>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {error && <p className="field__error" role="alert">{error}</p>}
      <Button type="submit" variant="secondary" block disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function RecipientForm({
  onSave,
  submitLabel,
  defaultCountry,
}: {
  onSave: SaveFn<NewRecipient>;
  submitLabel: string;
  defaultCountry?: string | null;
}) {
  const t = useTranslations("setup");
  const c = useTranslations("common");
  const locale = useLocale() as "es" | "en";
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState(defaultCountry ?? "MX");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});
  const { busy, error, run } = useSubmit();

  function submit(e: FormEvent) {
    e.preventDefault();
    const cents = parseCents(amount);
    const next = { name: name.trim() ? undefined : c("nameRequired"), amount: cents ? undefined : c("amountInvalid") };
    setErrors(next);
    if (next.name || next.amount || !cents) return;
    const ctry = countryByCode(country)!;
    run(async () => {
      await onSave({
        name: name.trim(),
        country: ctry.code,
        currency: ctry.currency,
        default_amount_cents: cents,
        frequency,
      });
      setName("");
      setAmount("");
    });
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <Field label={t("recipientName")} error={errors.name}>
        {(p) => (
          <Input {...p} value={name} placeholder={t("recipientPlaceholder")} onChange={(e) => setName(e.target.value)} />
        )}
      </Field>
      <div className="field-row">
        <Field label={t("country")}>
          {(p) => (
            <Select {...p} value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((ct) => (
                <option key={ct.code} value={ct.code}>
                  {ct[locale]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={c("amount")} error={errors.amount}>
          {(p) => <MoneyInput {...p} value={amount} onChange={(e) => setAmount(e.target.value)} />}
        </Field>
      </div>
      <div className="field">
        <span className="field__label">{t("frequency")}</span>
        <Segmented
          label={t("frequency")}
          value={frequency}
          onChange={setFrequency}
          options={[
            { value: "monthly", label: t("monthly") },
            { value: "biweekly", label: t("biweekly") },
          ]}
        />
      </div>
      {error && <p className="field__error" role="alert">{error}</p>}
      <Button type="submit" variant="secondary" block disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}

function defaultGoalDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}

export function GoalForm({ onSave, submitLabel }: { onSave: SaveFn<NewGoal>; submitLabel: string }) {
  const t = useTranslations("setup");
  const c = useTranslations("common");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultGoalDate);
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});
  const { busy, error, run } = useSubmit();

  function submit(e: FormEvent) {
    e.preventDefault();
    const cents = parseCents(amount);
    const next = { name: name.trim() ? undefined : c("nameRequired"), amount: cents ? undefined : c("amountInvalid") };
    setErrors(next);
    if (next.name || next.amount || !cents) return;
    run(async () => {
      await onSave({ name: name.trim(), target_cents: cents, target_date: date });
      setName("");
      setAmount("");
    });
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <Field label={t("goalName")} error={errors.name}>
        {(p) => <Input {...p} value={name} placeholder={t("goalPlaceholder")} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <div className="field-row">
        <Field label={t("goalTarget")} error={errors.amount}>
          {(p) => <MoneyInput {...p} value={amount} onChange={(e) => setAmount(e.target.value)} />}
        </Field>
        <Field label={t("goalDate")}>
          {(p) => (
            <Input
              {...p}
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
        </Field>
      </div>
      {error && <p className="field__error" role="alert">{error}</p>}
      <Button type="submit" variant="secondary" block disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
