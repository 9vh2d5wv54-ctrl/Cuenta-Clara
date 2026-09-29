"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClaraOrb, OrbMark } from "@/components/ClaraCard";
import { Icon } from "@/components/Icon";
import { useData } from "@/components/DataProvider";
import { Forecast } from "@/components/Forecast";
import { PlusPreview } from "@/components/Plus";
import { Button, Card } from "@/components/ui";
import { checkupInput, summarize } from "@/lib/budget";
import { monthName } from "@/lib/forecast";
import { formatUSD } from "@/lib/money";
import { hasPlus } from "@/lib/plan";

// Screen 9: the free money checkup. Written once a month, saved, never paywalled.
export default function Chequeo() {
  const t = useTranslations("checkup");
  const f = useTranslations("forecast");
  const locale = useLocale() as "es" | "en";
  const { checkup, income, bills, recipients, goals, entries, month, subscription, taxPct, mutate } = useData();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const generate = useCallback(async () => {
    setFailed(false);
    try {
      await mutate((s) => s.generateCheckup(checkupInput(locale, month, income ?? 0, bills, recipients, goals, entries, undefined, taxPct)));
    } catch {
      setFailed(true);
      started.current = false;
    }
  }, [mutate, locale, month, income, bills, recipients, goals, entries, taxPct]);

  useEffect(() => {
    if (checkup || income === null || started.current) return;
    started.current = true;
    generate();
  }, [checkup, income, generate]);

  if (income === null && !checkup) {
    return (
      <main className="page">
        <h1 className="t-title">{t("title")}</h1>
        <Card>
          <div className="stack-sm">
            <p className="t-body">{t("needsSetup")}</p>
            <Link href="/app/setup" className="t-label">
              {t("finishSetup")}
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  if (!checkup) {
    return (
      <main className="page checkup-loading">
        {failed ? (
          <div className="stack">
            <p className="t-body">{t("failed")}</p>
            <Button onClick={generate}>{t("retry")}</Button>
          </div>
        ) : (
          <div className="stack" role="status">
            <OrbMark size="lg" />
            <p className="t-title">{t("loading")}</p>
          </div>
        )}
      </main>
    );
  }

  const left = summarize(income ?? 0, bills, recipients, goals, entries, undefined, taxPct).left;
  const plus = hasPlus(subscription);

  return (
    <main className="page">
      <div>
        <p className="t-caption muted">
          {(() => {
            const name = monthName(checkup.month, locale, true);
            return name.charAt(0).toUpperCase() + name.slice(1);
          })()}
        </p>
        <h1 className="t-title">{t("title")}</h1>
      </div>

      <section className="hero-card" aria-label={t("leftToday")}>
        <span className="hero-card__sparkles" aria-hidden />
        <div className="hero-card__main">
          <p className="hero-card__label">
            <Icon name="heart" size={18} />
            {t("leftToday")}
          </p>
          {/* Live number; the letter below is a snapshot from when the checkup was written. */}
          <p className={left < 0 ? "hero-card__big hero-card__big--neg" : "hero-card__big"}>{formatUSD(left)}</p>
        </div>
      </section>

      <article className="card checkup-letter">
        <div className="row">
          <OrbMark size="xs" />
          <p className="t-label">Clara</p>
        </div>
        <div className="checkup-text">
          {checkup.summary_text
            .split(/\n{2,}|\n(?=\d\))/)
            .map((para) => para.trim())
            .filter(Boolean)
            .map((para, i) => {
              const step = para.match(/^(\d)\)\s*(.*)$/s);
              return step ? (
                <p key={i} className="checkup-step t-body">
                  <span className="checkup-step__n" aria-hidden>
                    {step[1]}
                  </span>
                  <span>{step[2]}</span>
                </p>
              ) : (
                <p key={i} className={i === 0 ? "t-body checkup-lead" : "t-body"}>
                  {para}
                </p>
              );
            })}
        </div>
        <p className="t-caption muted">
          {t("writtenOn", {
            date: new Date(checkup.created_at).toLocaleDateString(locale === "es" ? "es-US" : "en-US", {
              day: "numeric",
              month: "long",
            }),
          })}{" "}
          {t("free")}
        </p>
      </article>

      <Card>
        {plus ? (
          <Forecast />
        ) : (
          <PlusPreview feature="forecast" label={f("locked")}>
            <Forecast />
          </PlusPreview>
        )}
      </Card>

      <ClaraOrb />
    </main>
  );
}
