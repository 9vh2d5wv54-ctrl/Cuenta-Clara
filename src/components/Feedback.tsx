"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { Button, Dialog } from "./ui";
import { FEEDBACK_KINDS, MAX_FEEDBACK, type FeedbackKind } from "@/lib/feedback";

const ICONS: Record<FeedbackKind, IconName> = { confusing: "info", bug: "alert", idea: "smile", love: "heart" };

/** A button that opens the feedback pop-up. `children` is what the button looks like. */
export function FeedbackButton({ className, children }: { className?: string; children: ReactNode }) {
  const t = useTranslations("feedback");
  const locale = useLocale();
  const page = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("confusing");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "limit">("idle");

  function start() {
    setOpen(true);
    setState("idle");
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message, page, lang: locale }),
      });
      if (res.ok) {
        setState("sent");
        setMessage("");
      } else setState(res.status === 429 ? "limit" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={start}>
        {children}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("title")}>
        {state === "sent" ? (
          <div className="stack feedback-done">
            <span className="feedback-done__icon" aria-hidden>
              <Icon name="check" size={28} />
            </span>
            <p className="t-heading">{t("thanks")}</p>
            <p className="t-body muted">{t("thanksLead")}</p>
            <Button block onClick={() => setOpen(false)}>
              {t("close")}
            </Button>
          </div>
        ) : (
          <form className="stack" onSubmit={send} noValidate>
            <p className="t-body muted">{t("lead")}</p>
            <div className="feedback-kinds" role="radiogroup" aria-label={t("kindLabel")}>
              {FEEDBACK_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  className={kind === k ? "pick-chip pick-chip--on" : "pick-chip"}
                  onClick={() => setKind(k)}
                >
                  <Icon name={ICONS[k]} size={18} />
                  {t(`kind_${k}`)}
                </button>
              ))}
            </div>
            <label className="field">
              <span className="field__label">{t("messageLabel")}</span>
              <textarea
                className="input feedback-text"
                rows={4}
                maxLength={MAX_FEEDBACK}
                value={message}
                placeholder={t(`placeholder_${kind}`)}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <p className="t-caption muted">{t("privacy")}</p>
            {state === "error" && (
              <p className="notice notice--alerta t-caption" role="alert">
                {t("error")}
              </p>
            )}
            {state === "limit" && (
              <p className="notice t-caption" role="alert">
                {t("limit")}
              </p>
            )}
            <Button type="submit" block disabled={state === "sending" || !message.trim()}>
              <Icon name="send" size={18} />
              {state === "sending" ? t("sending") : t("send")}
            </Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
