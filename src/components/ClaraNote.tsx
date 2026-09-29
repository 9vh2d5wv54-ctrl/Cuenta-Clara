"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useData } from "./DataProvider";
import { OrbMark } from "./ClaraCard";
import { Icon } from "./Icon";
import type { ClaraNote } from "@/lib/clara-note";
import { formatShortDate } from "@/lib/dates";

/** Home: Clara's weekly note (written Sundays from the person's own numbers). */
export function ClaraNoteCard() {
  const t = useTranslations("claraNote");
  const locale = useLocale();
  const { store, entries, business } = useData();
  const [note, setNote] = useState<ClaraNote | null>(null);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    let off = false;
    store
      .claraNote()
      .then((n) => {
        if (off || !n) return;
        setNote(n);
        if (!n.seen_at) {
          setFresh(true);
          store.claraNoteSeen(n.id).catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      off = true;
    };
    // Demo notes are written from local data, so refresh when it changes.
  }, [store, entries, business]);

  if (!note) return null;
  return (
    <section className="card clara-note" aria-labelledby="clara-note-title">
      <div className="clara-note__head">
        <OrbMark size="sm" />
        <div className="grow">
          <h2 id="clara-note-title" className="t-label clara-note__title">
            {t("title")}
          </h2>
          <p className="t-caption muted">{t("week", { date: formatShortDate(note.week, locale) })}</p>
        </div>
        {fresh && <span className="clara-note__new t-caption">{t("new")}</span>}
      </div>
      <p className="t-body clara-note__body">{note.body}</p>
      <Link href={`/app/clara?q=${encodeURIComponent(t("askQ"))}`} className="t-label clara-note__ask">
        {t("ask")}
        <Icon name="forward" size={16} />
      </Link>
    </section>
  );
}
