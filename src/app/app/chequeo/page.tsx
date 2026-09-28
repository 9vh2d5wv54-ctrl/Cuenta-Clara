"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClaraCard } from "@/components/ClaraCard";
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
            <span className="spinner" aria-hidden />
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

      <Card className="checkup-card">
        {/* Live number; the text below is a snapshot from when the checkup was written. */}
        <p className="t-label muted">{t("leftToday")}</p>
        <p className={left < 0 ? "t-money-xl hero__figure hero__figure--negative" : "t-money-xl hero__figure"}>
          {formatUSD(left)}
        </p>
        <div className="checkup-text">
          {checkup.summary_text.split(/\n{2,}|\n(?=\d\))/).map((para, i) => (
            <p key={i} className="t-body">
              {para.trim()}
            </p>
          ))}
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
      </Card>

      <Card>
        {plus ? (
          <Forecast />
        ) : (
          <PlusPreview feature="forecast" label={f("locked")}>
            <Forecast />
          </PlusPreview>
        )}
      </Card>

      <ClaraCard />
    </main>
  );
}
