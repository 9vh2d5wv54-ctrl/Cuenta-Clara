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

  const next = FIRST_STEPS.find((s) => !done[s]);
  const celebrate = view === "celebrate";
  const shown = celebrate ? FIRST_STEPS.length : count;

  return (
    <section className={celebrate ? "card first-steps first-steps--done" : "card first-steps"} aria-labelledby="first-steps-title">
      <div className="first-steps__head">
        <StepsRing value={shown} total={FIRST_STEPS.length} label={t("progress", { count: shown, total: FIRST_STEPS.length })} />
        <div className="grow first-steps__text">
          <h2 id="first-steps-title" className="t-label" style={{ margin: 0 }}>
            {celebrate ? t("allSet") : t("title")}
          </h2>
          <p className="t-caption muted" role={celebrate ? "status" : undefined}>
            {celebrate ? t("allSetLead") : t("progress", { count, total: FIRST_STEPS.length })}
          </p>
        </div>
        <button type="button" className="icon-btn first-steps__close" aria-label={t("hide")} onClick={close}>
          <Icon name="close" size={18} />
        </button>
      </div>
      {!celebrate && (
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
                <Link href={href[s]} className={s === next ? "first-steps__item first-steps__item--next" : "first-steps__item"}>
                  <span className="first-steps__dot" aria-hidden>
                    <Icon name={ICON[s]} size={16} />
                  </span>
                  <span className="grow first-steps__text">
                    <span className="t-body">{t(s)}</span>
                    <span className="t-caption muted">{t(`${s}_why`)}</span>
                  </span>
                  {s === next && <span className="first-steps__pill">{t("next")}</span>}
                  <Icon name="forward" size={18} />
                </Link>
              </li>
            ),
          )}
        </ol>
      )}
    </section>
  );
}

const ICON: Record<FirstStep, "wallet" | "smile" | "plus"> = { setup: "wallet", clara: "smile", log: "plus" };

/** The radar ring: fills a third per step, with a blip sweeping when all are done. */
function StepsRing({ value, total, label }: { value: number; total: number; label: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="steps-ring" role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={r} className="steps-ring__track" />
        <circle cx="50" cy="50" r={r} className="steps-ring__fill" strokeDasharray={`${(c * value) / total} ${c}`} transform="rotate(-90 50 50)" />
      </svg>
      <span className="steps-ring__text num" aria-hidden>
        {value === total ? <Icon name="check" size={22} /> : `${value}/${total}`}
      </span>
    </div>
  );
}
