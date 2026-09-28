"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useData } from "./DataProvider";
import { Icon } from "./Icon";
import { Button, Card, Input } from "./ui";
import { formatShortDate, todayISO } from "@/lib/dates";
import { formatUSD } from "@/lib/money";
import { shrinkPhoto } from "@/lib/photo";
import { MAX_TEXT, type ParsedEntry } from "@/lib/quick-log";

// Plus: log by voice, typing, or a receipt photo. Speech becomes text in the
// browser (Web Speech API, when the phone supports it); the server turns the
// text or photo into entries; the person checks them before anything is saved.

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function QuickLog({ onEdit, onSaved }: { onEdit: (e: ParsedEntry) => void; onSaved: (entries: ParsedEntry[]) => void }) {
  const t = useTranslations("quicklog");
  const a = useTranslations("add");
  const cat = useTranslations("add.categories");
  const locale = useLocale();
  const { recipients, bills, goals, mutate } = useData();

  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [found, setFound] = useState<ParsedEntry[]>([]);
  const [canTalk, setCanTalk] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const heard = useRef("");

  useEffect(() => setCanTalk(speechRecognition() !== null), []);

  const lists = {
    recipients: recipients.map((r) => ({ id: r.id, name: r.name })),
    bills: bills.map((b) => ({ id: b.id, name: b.name })),
    goals: goals.map((g) => ({ id: g.id, name: g.name })),
  };

  async function read(payload: { text: string } | { image: { media_type: string; data: string } }) {
    setBusy(true);
    setMessage(null);
    setFound([]);
    try {
      const res = await fetch("/api/quick-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, today: todayISO(), lists }),
      });
      if (res.status === 503) return setMessage(t("photosOff"));
      if (!res.ok) return setMessage(t("error"));
      const { entries } = (await res.json()) as { entries: ParsedEntry[] };
      if (entries.length === 0) return setMessage(t("nothing"));
      setFound(entries);
    } catch {
      setMessage(t("error"));
    } finally {
      setBusy(false);
    }
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (text.trim()) read({ text: text.trim() });
  }

  function talk() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const SR = speechRecognition();
    if (!SR) return;
    const r = new SR();
    r.lang = locale === "es" ? "es-US" : "en-US";
    r.interimResults = true;
    r.continuous = false;
    heard.current = "";
    r.onresult = (e) => {
      heard.current = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ")
        .slice(0, MAX_TEXT);
      setText(heard.current);
    };
    r.onerror = () => setListening(false);
    r.onend = () => {
      setListening(false);
      if (heard.current.trim()) read({ text: heard.current.trim() });
    };
    recognition.current = r;
    setListening(true);
    setMessage(null);
    r.start();
  }

  async function photo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = await shrinkPhoto(file);
      await read({ image: { media_type: "image/jpeg", data } });
    } catch {
      setMessage(t("error"));
    }
  }

  async function saveAll() {
    setBusy(true);
    try {
      await mutate(async (s) => {
        for (const e of found) {
          await s.addEntry({
            type: e.type,
            amount_cents: e.amount_cents,
            category: e.category,
            recipient_id: e.type === "send" ? e.match_id : null,
            date: e.date,
            note: e.note,
          });
          if (e.type === "savings" && e.match_id) await s.addToGoal(e.match_id, e.amount_cents);
        }
      });
      const saved = found;
      setFound([]);
      setText("");
      onSaved(saved);
    } catch {
      setMessage(t("error"));
    } finally {
      setBusy(false);
    }
  }

  const typeLabel: Record<ParsedEntry["type"], string> = {
    expense: a("typeExpense"),
    send: a("typeSend"),
    bill_paid: a("typeBill"),
    savings: a("typeSavings"),
    income: a("typeIncome"),
  };
  const matchName = (e: ParsedEntry) =>
    [...recipients, ...bills, ...goals].find((x) => x.id === e.match_id)?.name ?? null;

  return (
    <Card tone="clara">
      <div className="stack">
        <p className="t-heading">{t("title")}</p>
        <form className="stack-sm" onSubmit={submit}>
          <Input
            aria-label={t("title")}
            value={text}
            maxLength={MAX_TEXT}
            placeholder={t("placeholder")}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
          <div className="field-row">
            {canTalk && (
              <Button type="button" variant="secondary" onClick={talk} disabled={busy}>
                <Icon name="mic" size={20} />
                {listening ? t("stop") : t("mic")}
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => photoInput.current?.click()} disabled={busy || listening}>
              <Icon name="camera" size={20} />
              {t("photo")}
            </Button>
          </div>
          <input ref={photoInput} type="file" accept="image/*" hidden onChange={photo} />
          <Button type="submit" block disabled={busy || listening || !text.trim()}>
            {busy ? t("reading") : listening ? t("listening") : t("go")}
          </Button>
          <p className="t-caption muted">{t("photoNote")}</p>
        </form>

        {message && (
          <p className="notice t-caption" role="status">
            {message}
          </p>
        )}

        {found.length > 0 && (
          <div className="stack-sm" role="status">
            <p className="t-body">{t("found")}</p>
            <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {found.map((e, i) => (
                <li key={i} className="list-row">
                  <div className="grow">
                    <p className="t-body">
                      {typeLabel[e.type]}
                      {e.type === "expense" ? ` · ${cat(e.category)}` : matchName(e) ? ` · ${matchName(e)}` : ""}
                    </p>
                    <p className="t-caption muted">
                      {[e.note !== matchName(e) ? e.note : null, e.date !== todayISO() ? formatShortDate(e.date, locale) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="t-body num">{formatUSD(e.amount_cents)}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t("edit")}
                    onClick={() => {
                      setFound(found.filter((_, j) => j !== i));
                      onEdit(e);
                    }}
                  >
                    <Icon name="edit" size={20} />
                  </button>
                </li>
              ))}
            </ul>
            <Button block onClick={saveAll} disabled={busy}>
              {found.length > 1 ? t("saveAll") : t("save")}
            </Button>
            <Button variant="ghost" block onClick={() => setFound([])} disabled={busy}>
              {t("discard")}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
