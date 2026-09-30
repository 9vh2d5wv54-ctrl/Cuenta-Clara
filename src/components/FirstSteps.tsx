"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useData } from "./DataProvider";
import { Icon } from "./Icon";
import { accountAgeDays } from "@/lib/checkin";
import { FIRST_STEPS, askedClaraKey, firstStepsKey, firstStepsView, type FirstStep } from "@/lib/first-steps";
import { localizeDollars } from "@/lib/money";

/** Home: the three first things to try, checked off as they happen. */
export function FirstStepsCard() {
  const t = useTranslations("firstSteps");
  const { profile, income, bills, entries, store } = useData();
  const [asked, setAsked] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let askedHere = false;
    try {
      setSaved(localStorage.getItem(firstStepsKey(profile.id)));
      askedHere = localStorage.getItem(askedClaraKey(profile.id)) !== null;
    } catch {}
    setLoaded(true);
    if (askedHere) {
      setAsked(true);
      return;
    }
    store
      .claraConversations()
      .then((c) => setAsked(c.length > 0))
      .catch(() => setAsked(false));
  }, [profile, store]);

  const done: Record<FirstStep, boolean> = {
    setup: income !== null && bills.length > 0,
    clara: asked === true,
    log: entries.length > 0,
  };
  const view = !profile || !loaded || asked === null ? "hidden" : firstStepsView({ ageDays: accountAgeDays(profile.created_at), done, saved });

  useEffect(() => {
    if (view === "list" && saved !== "open" && profile) {
      try {
        localStorage.setItem(firstStepsKey(profile.id), "open");
      } catch {}
    }
  }, [view, saved, profile]);

  function close() {
    try {
      if (profile) localStorage.setItem(firstStepsKey(profile.id), "closed");
    } catch {}
    setSaved("closed");
  }

  if (view === "hidden") return null;

  const count = FIRST_STEPS.filter((s) => done[s]).length;
  const href: Record<FirstStep, string> = {
    setup: "/app/setup",
    clara: `/app/clara?q=${encodeURIComponent(localizeDollars(t("claraQuestion")))}`,
    log: "/app/add",
  };

  return (
    <section className="card first-steps stack-sm" aria-labelledby="first-steps-title">
      <div className="row row--between">
        <h2 id="first-steps-title" className="t-label" style={{ margin: 0 }}>
          {view === "celebrate" ? t("allSet") : t("title")}
        </h2>
        <button type="button" className="icon-btn" aria-label={t("hide")} onClick={close}>
          <Icon name="close" size={18} />
        </button>
      </div>
      {view === "celebrate" ? (
        <p className="t-body muted" role="status">
          {t("allSetLead")}
        </p>
      ) : (
        <>
          <p className="t-caption muted">{t("progress", { count, total: FIRST_STEPS.length })}</p>
          <span className="bar bar--clara" role="progressbar" aria-label={t("title")} aria-valuemin={0} aria-valuemax={FIRST_STEPS.length} aria-valuenow={count}>
            <span style={{ width: `${(count / FIRST_STEPS.length) * 100}%` }} />
          </span>
          <ol className="first-steps__list">
            {FIRST_STEPS.map((s) =>
              done[s] ? (
                <li key={s} className="first-steps__item first-steps__item--done">
                  <span className="first-steps__dot" aria-hidden>
                    <Icon name="check" size={16} />
                  </span>
                  <span className="t-body grow">{t(`${s}_done`)}</span>
                </li>
              ) : (
                <li key={s}>
                  <Link href={href[s]} className="first-steps__item">
                    <span className="first-steps__dot" aria-hidden />
                    <span className="grow first-steps__text">
                      <span className="t-body">{t(s)}</span>
                      <span className="t-caption muted">{t(`${s}_why`)}</span>
                    </span>
                    <Icon name="forward" size={18} />
                  </Link>
                </li>
              ),
            )}
          </ol>
        </>
      )}
    </section>
  );
}
