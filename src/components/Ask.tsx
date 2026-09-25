"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { checkupInput } from "@/lib/budget";
import { useData } from "./DataProvider";
import { Button, Field, Input } from "./ui";

/** Plus: "¿Me alcanza?" — answers from the person's own budget, 30 a day. */
export function Ask() {
  const t = useTranslations("ask");
  const locale = useLocale() as "es" | "en";
  const { store, month, income, bills, recipients, goals, entries } = useData();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setNote(null);
    const input = checkupInput(locale, month, income ?? 0, bills, recipients, goals, entries);
    const result = await store.ask(question.trim(), input);
    setBusy(false);
    if (result.kind === "answer") {
      setAnswer(result.answer);
      setNote(t("remaining", { count: result.remaining }));
      setQuestion("");
    } else if (result.kind === "limit") {
      setNote(t("limit"));
    } else {
      setNote(t("failed"));
    }
  }

  return (
    <div className="stack-sm">
      <h2 className="t-heading">{t("title")}</h2>
      <p className="t-body muted">{t("lead")}</p>
      <form className="stack-sm" onSubmit={submit}>
        <Field label={t("title")}>
          {(p) => (
            <Input {...p} value={question} placeholder={t("placeholder")} maxLength={500} onChange={(e) => setQuestion(e.target.value)} />
          )}
        </Field>
        <Button type="submit" variant="secondary" disabled={busy || !question.trim()}>
          {busy ? t("thinking") : t("send")}
        </Button>
      </form>
      {answer && (
        <div className="card card--mango ask-answer" role="status">
          {answer.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="t-body">
              {para}
            </p>
          ))}
        </div>
      )}
      {note && <p className="t-caption muted">{note}</p>}
      <p className="t-caption muted">{t("disclaimer")}</p>
    </div>
  );
}
