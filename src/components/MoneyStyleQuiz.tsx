"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, Card } from "./ui";
import { QUESTION_COUNT, saveStyle, scoreStyle, STYLES, TIP_LESSONS, type MoneyStyle } from "@/lib/money-style";

const SHARE_PATH = "/estilo";

export function MoneyStyleQuiz() {
  const t = useTranslations("moneyStyle");
  const [answers, setAnswers] = useState<MoneyStyle[]>([]);
  const [started, setStarted] = useState(false);
  const [copied, setCopied] = useState(false);

  function answer(style: MoneyStyle) {
    const next = [...answers, style];
    setAnswers(next);
    if (next.length === QUESTION_COUNT) saveStyle(scoreStyle(next).style);
    window.scrollTo({ top: 0 });
  }

  async function share() {
    const url = `${window.location.origin}${SHARE_PATH}`;
    try {
      if (navigator.share) await navigator.share({ title: t("title"), text: t("shareText"), url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      // share sheet closed or clipboard blocked
    }
  }

  if (!started) {
    return (
      <>
        <div className="stack-sm">
          <h1 className="t-title">{t("title")}</h1>
          <p className="t-body muted">{t("lead")}</p>
          <p className="t-caption muted">{t("time")}</p>
        </div>
        <Button block onClick={() => setStarted(true)}>
          {t("start")}
        </Button>
        <p className="t-caption muted">{t("disclaimer")}</p>
      </>
    );
  }

  const q = answers.length;
  if (q < QUESTION_COUNT) {
    const options = t.raw(`q${q + 1}.options`) as string[];
    return (
      <>
        <div className="stack-sm">
          <p className="t-label muted">{t("progress", { n: q + 1, total: QUESTION_COUNT })}</p>
          <div className="quiz-bar" aria-hidden>
            <span style={{ width: `${(q / QUESTION_COUNT) * 100}%` }} />
          </div>
          <h1 className="t-title">{t(`q${q + 1}.question`)}</h1>
        </div>
        <div className="stack-sm">
          {STYLES.map((style, i) => (
            <button key={style} type="button" className="card quiz-option t-body" onClick={() => answer(style)}>
              {options[i]}
            </button>
          ))}
        </div>
        {q > 0 && (
          <Button variant="ghost" onClick={() => setAnswers(answers.slice(0, -1))}>
            ← {t("back")}
          </Button>
        )}
      </>
    );
  }

  const result = scoreStyle(answers);
  const s = result.style;
  const tips = t.raw(`${s}.tips`) as string[];

  return (
    <>
      <Card className="hero">
        <p className="t-label muted">{t("yourStyle")}</p>
        <p className="t-money-xl hero__figure">{t(`${s}.name`)}</p>
        <p className="t-body">{t(`${s}.summary`)}</p>
        {result.also && <p className="t-caption muted">{t("also", { style: t(`${result.also}.name`) })}</p>}
      </Card>

      <Card>
        <div className="stack-sm">
          <p className="t-label">{t("strength")}</p>
          <p className="t-body">{t(`${s}.strength`)}</p>
          <p className="t-label">{t("watchOut")}</p>
          <p className="t-body">{t(`${s}.watchOut`)}</p>
        </div>
      </Card>

      <Card>
        <div className="stack">
          <p className="t-heading">{t("tipsTitle")}</p>
          {tips.map((tip, i) => (
            <div key={tip} className="stack-sm">
              <p className="t-body">
                {i + 1}. {tip}
              </p>
              <Link href={`/aprende/${TIP_LESSONS[s][i]}`} className="t-label">
                {t("lesson")} →
              </Link>
            </div>
          ))}
        </div>
      </Card>

      <Link href="/app" className="btn btn--primary btn--block">
        {t("cta")}
      </Link>
      <Button variant="secondary" block onClick={share}>
        {copied ? t("copied") : t("share")}
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          setAnswers([]);
          setCopied(false);
        }}
      >
        {t("again")}
      </Button>
      <p className="t-caption muted">{t("disclaimer")}</p>
    </>
  );
}
