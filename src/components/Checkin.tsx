"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useData } from "./DataProvider";
import { Icon } from "./Icon";
import { Button } from "./ui";
import { CHECKIN_MOODS, checkinDue, checkinKey, type CheckinMood } from "@/lib/checkin";

const EMOJI: Record<CheckinMood, string> = { meh: "😕", ok: "🙂", love: "😍" };

/** Home: "How's it going?" once, from day 3. The answer is emailed to the team like feedback. */
export function CheckinCard() {
  const t = useTranslations("checkin");
  const locale = useLocale();
  const { profile } = useData();
  const [show, setShow] = useState(false);
  const [mood, setMood] = useState<CheckinMood | null>(null);
  const [text, setText] = useState("");
  const [state, setState] = useState<"ask" | "sending" | "thanks" | "error">("ask");

  useEffect(() => {
    if (!profile) return;
    let done = false;
    try {
      done = localStorage.getItem(checkinKey(profile.id)) !== null;
    } catch {}
    setShow(checkinDue(profile.created_at, done));
  }, [profile]);

  function finish(value: string) {
    try {
      if (profile) localStorage.setItem(checkinKey(profile.id), value);
    } catch {}
  }

  async function send() {
    if (!mood) return;
    setState("sending");
    const message = `${EMOJI[mood]} ${t(`mood_${mood}`)}${text.trim() ? `\n\n${text.trim()}` : ""}`;
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "checkin", message, page: "/app", lang: locale === "en" ? "en" : "es" }),
    }).catch(() => null);
    if (res?.ok) {
      finish(mood);
      setState("thanks");
    } else setState("error");
  }

  if (!show) return null;
  if (state === "thanks") {
    return (
      <section className="card checkin stack-sm" role="status">
        <p className="t-label">{t("thanks")}</p>
        <p className="t-body muted">{t("thanksLead")}</p>
      </section>
    );
  }
  return (
    <section className="card checkin stack-sm" aria-labelledby="checkin-title">
      <div className="row row--between">
        <h2 id="checkin-title" className="t-label" style={{ margin: 0 }}>
          {t("title")}
        </h2>
        <button
          type="button"
          className="icon-btn"
          aria-label={t("dismiss")}
          onClick={() => {
            finish("dismissed");
            setShow(false);
          }}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className="checkin__moods" role="radiogroup" aria-label={t("title")}>
        {CHECKIN_MOODS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mood === m}
            className={mood === m ? "checkin__mood checkin__mood--on" : "checkin__mood"}
            onClick={() => setMood(m)}
          >
            <span className="checkin__emoji" aria-hidden>
              {EMOJI[m]}
            </span>
            <span className="t-caption">{t(`mood_${m}`)}</span>
          </button>
        ))}
      </div>
      {mood && (
        <>
          <label className="t-caption muted" htmlFor="checkin-text">
            {t(`ask_${mood}`)}
          </label>
          <textarea
            id="checkin-text"
            className="input checkin__text"
            rows={3}
            maxLength={1000}
            value={text}
            placeholder={t("placeholder")}
            onChange={(e) => setText(e.target.value)}
          />
          {state === "error" && (
            <p className="notice notice--alerta t-caption" role="alert">
              {t("error")}
            </p>
          )}
          <Button block onClick={send} disabled={state === "sending"}>
            {state === "sending" ? t("sending") : t("send")}
          </Button>
        </>
      )}
    </section>
  );
}
