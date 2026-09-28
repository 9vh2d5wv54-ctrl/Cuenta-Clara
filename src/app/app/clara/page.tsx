"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/components/Icon";
import { PlusCard } from "@/components/Plus";
import { WhatIfChart } from "@/components/WhatIfChart";
import { hasPlus } from "@/lib/plan";
import { Button, Card, Dialog } from "@/components/ui";
import type { ClaraData, ClaraLinks } from "@/lib/clara-tools";
import { MAX_QUESTION_LENGTH } from "@/lib/clara-safety";
import type { ClaraConversation, ClaraTurnData } from "@/lib/store";

type Turn = ClaraTurnData & { links?: ClaraLinks; crisis?: boolean; pending?: boolean; failed?: boolean; unlocked?: boolean };

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Older browsers: a v4-shaped id from Math.random is fine for grouping a conversation.
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (Number(c) ^ (Math.floor(Math.random() * 16) >> (Number(c) / 4))).toString(16),
    );
  }
}

// Clara, the AI money copilot: "Pregúntale a Clara". Free: 3 questions a month;
// Plus: 30 a day. The app does the math; Clara explains it.
function ClaraChat() {
  const t = useTranslations("clara");
  const pl = useTranslations("plus");
  const locale = useLocale() as "es" | "en";
  const params = useSearchParams();
  const { store, profile, income, bills, recipients, goals, recent, debts, subscription, taxPct } = useData();
  const [conversationId, setConversationId] = useState(newId);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [limit, setLimit] = useState<{ plus: boolean; per: "day" | "month"; limit: number } | null>(null);
  const [past, setPast] = useState<ClaraConversation[]>([]);
  const [showPast, setShowPast] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sentFromLink = useRef(false);

  const refreshPast = useCallback(() => {
    store.claraConversations().then(setPast).catch(() => setPast([]));
  }, [store]);
  useEffect(refreshPast, [refreshPast]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim().slice(0, MAX_QUESTION_LENGTH);
      if (!q || busy) return;
      setBusy(true);
      setNote(null);
      setText("");
      const history = turns.filter((x) => !x.pending && !x.failed && !x.crisis).map(({ question, answer }) => ({ question, answer }));
      setTurns((prev) => [...prev, { question: q, answer: "", pending: true }]);
      const snapshot: ClaraData = { profile, income: income ?? 0, bills, recipients, goals, recent, debts, subscription, taxPct };
      const result = await store.claraAsk({ question: q, conversationId, history, lang: locale }, snapshot);
      setBusy(false);
      if (result.kind === "answer") {
        setTurns((prev) => [...prev.slice(0, -1), { question: q, answer: result.answer, links: result.links, crisis: result.crisis, unlocked: result.unlocked }]);
        if (result.ai) {
          setNote(result.per === "day" ? t("leftToday", { count: result.remaining }) : t("leftMonth", { count: result.remaining, limit: result.limit }));
          refreshPast();
        }
      } else if (result.kind === "limit") {
        setTurns((prev) => prev.slice(0, -1));
        setText(q);
        setLimit(result);
      } else {
        setTurns((prev) => [...prev.slice(0, -1), { question: q, answer: t("failed"), failed: true }]);
      }
    },
    [busy, turns, profile, income, bills, recipients, goals, recent, debts, subscription, taxPct, store, conversationId, locale, t, refreshPast],
  );

  // A suggested question tapped on Home arrives as ?q=… and is asked right away, once.
  useEffect(() => {
    const q = params.get("q");
    if (q && !sentFromLink.current) {
      sentFromLink.current = true;
      void ask(q);
    }
  }, [params, ask]);

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(text);
  }

  function startNew() {
    setConversationId(newId());
    setTurns([]);
    setNote(null);
    setLimit(null);
    setShowPast(false);
  }

  async function open(c: ClaraConversation) {
    const loaded = await store.claraConversation(c.id);
    setConversationId(c.id);
    setTurns(loaded);
    setLimit(null);
    setNote(null);
    setShowPast(false);
  }

  async function remove(id: string) {
    setDeleting(null);
    if (await store.claraDelete(id)) {
      if (id === conversationId) startNew();
      refreshPast();
    }
  }

  const suggestions = t.raw("suggestions") as string[];

  return (
    <main className="page clara-page">
      <div className="row row--between">
        <div className="row">
          <span className="clara-avatar clara-avatar--lg" aria-hidden>
            C
          </span>
          <div>
            <h1 className="t-title">{t("title")}</h1>
            <p className="t-caption muted">{t("subtitle")}</p>
          </div>
        </div>
        {turns.length > 0 && (
          <Button variant="ghost" onClick={startNew}>
            <Icon name="plus" size={20} />
            {t("new")}
          </Button>
        )}
      </div>

      {past.length > 0 && (
        <div className="stack-sm">
          <button type="button" className="t-label clara-past-toggle" onClick={() => setShowPast(!showPast)} aria-expanded={showPast}>
            {t("past", { count: past.length })} {showPast ? "▴" : "▾"}
          </button>
          {showPast && (
            <ul className="stack-sm" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {past.map((c) => (
                <li key={c.id} className="card row clara-past">
                  <button type="button" className="grow clara-past__open t-body" onClick={() => open(c)}>
                    {c.title}
                  </button>
                  <button type="button" className="icon-btn" aria-label={`${t("delete")}: ${c.title}`} onClick={() => setDeleting(c.id)}>
                    <Icon name="trash" size={20} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="clara-thread" aria-live="polite">
        {turns.length === 0 && (
          <>
            <div className="clara-bubble clara-bubble--clara t-body">{t("hello")}</div>
            <div className="clara-chips">
              {suggestions.map((q) => (
                <button key={q} type="button" className="clara-chip t-caption" onClick={() => ask(q)} disabled={busy}>
                  {q}
                </button>
              ))}
            </div>
          </>
        )}
        {turns.map((turn, i) => (
          <div key={i} className="stack-sm">
            <div className="clara-bubble clara-bubble--me t-body">{turn.question}</div>
            {turn.pending ? (
              <div className="clara-bubble clara-bubble--clara t-body muted" role="status">
                {t("thinking")}
              </div>
            ) : turn.crisis ? (
              <CrisisCard text={turn.answer} />
            ) : (
              <div className={turn.failed ? "clara-bubble clara-bubble--clara clara-bubble--failed" : "clara-bubble clara-bubble--clara"}>
                {turn.answer.split(/\n{2,}/).map((para, j) => (
                  <p key={j} className="t-body">
                    {para}
                  </p>
                ))}
                {turn.links && (turn.links.lessons.length > 0 || turn.links.words.length > 0) && (
                  <div className="clara-chips">
                    {turn.links.lessons.map((l) => (
                      <Link key={l.slug} href={`/aprende/${l.slug}`} className="clara-chip clara-chip--link t-caption">
                        {t("lesson")}: {l.title}
                      </Link>
                    ))}
                    {turn.links.words.map((w) => (
                      <Link key={w.id} href={`/palabras#${w.id}`} className="clara-chip clara-chip--link t-caption">
                        {t("word")}: {w.term}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
            {turn.links?.chart && !turn.pending && <WhatIfChart chart={turn.links.chart} locked={!(hasPlus(subscription) || turn.unlocked)} />}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className={limit ? "clara-input clara-input--static" : "clara-input"} onSubmit={submit}>
        <label className="sr-only" htmlFor="clara-q">
          {t("placeholder")}
        </label>
        <textarea
          id="clara-q"
          className="input clara-input__field"
          rows={1}
          value={text}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder={t("placeholder")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(text);
            }
          }}
        />
        <Button type="submit" disabled={busy || !text.trim()} aria-label={t("send")}>
          <Icon name="send" size={20} />
        </Button>
      </form>
      {note && <p className="t-caption muted">{note}</p>}
      {limit && (
        <div className="stack-sm">
          <p className="notice t-body">
            {limit.per === "day" ? t("limitDay", { limit: limit.limit }) : t("limitMonth", { limit: limit.limit })}
          </p>
          {!limit.plus && <PlusCard feature="clara" title={pl("claraTitle")} />}
        </div>
      )}

      <p className="t-caption muted">{t("disclaimer")}</p>

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)} title={t("deleteTitle")}>
        <p className="t-body">{t("deleteBody")}</p>
        <div className="field-row">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            {t("keep")}
          </Button>
          <Button variant="danger" onClick={() => deleting && remove(deleting)}>
            {t("delete")}
          </Button>
        </div>
      </Dialog>
    </main>
  );
}

function CrisisCard({ text }: { text: string }) {
  const t = useTranslations("clara");
  return (
    <Card tone="alerta">
      <div className="stack-sm">
        {text.split(/\n{2,}/).map((para, j) => (
          <p key={j} className="t-body">
            {para}
          </p>
        ))}
        <div className="field-row">
          <a href="tel:988" className="btn btn--primary">
            {t("call988")}
          </a>
          <a href="sms:838255" className="btn btn--secondary">
            {t("text838255")}
          </a>
        </div>
      </div>
    </Card>
  );
}

export default function ClaraPage() {
  return (
    <Suspense>
      <ClaraChat />
    </Suspense>
  );
}
