"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useData } from "./DataProvider";
import { Button, Card } from "./ui";
import { hasPlus } from "@/lib/plan";

const NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

function masked(phone: string): string {
  return `+${phone.slice(0, phone.length - 10)} ••• ${phone.slice(-4)}`;
}

/** Settings → WhatsApp assistant (Plus). Shown once the WhatsApp number is set up. */
export function WhatsAppCard() {
  const t = useTranslations("whatsapp");
  const { store, profile, subscription, mutate } = useData();
  const [code, setCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!NUMBER || store.mode !== "supabase" || !hasPlus(subscription)) return null;
  const phone = profile?.whatsapp_phone;

  async function start() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/whatsapp/link", { method: "POST" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMessage(t("error"));
    const body = (await res.json()) as { code: string };
    setCode(body.code);
  }

  async function check() {
    setBusy(true);
    await mutate(async () => {});
    setBusy(false);
    setMessage(t("waiting"));
  }

  async function disconnect() {
    setBusy(true);
    await mutate(() => fetch("/api/whatsapp/link", { method: "DELETE" }));
    setBusy(false);
    setCode(null);
    setMessage(null);
  }

  const text = code ? `CLARA ${code}` : "";

  return (
    <Card>
      <div className="stack-sm">
        <div className="row row--between">
          <p className="t-heading">{t("title")}</p>
          <span className="plus-badge t-caption">Plus</span>
        </div>
        <p className="t-body muted">{t("lead")}</p>
        {phone ? (
          <>
            <p className="t-body">{t("connected", { phone: masked(phone) })}</p>
            <Button variant="ghost" block onClick={disconnect} disabled={busy}>
              {t("disconnect")}
            </Button>
          </>
        ) : code ? (
          <>
            <p className="t-body">{t("step")}</p>
            <p className="t-money-xl num" style={{ textAlign: "center" }}>
              {text}
            </p>
            <a
              className="btn btn--primary btn--block"
              href={`https://wa.me/${NUMBER}?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noreferrer"
            >
              {t("open")}
            </a>
            <Button variant="secondary" block onClick={check} disabled={busy}>
              {t("done")}
            </Button>
          </>
        ) : (
          <Button block onClick={start} disabled={busy}>
            {t("connect")}
          </Button>
        )}
        {message && !phone && (
          <p className="notice t-caption" role="status">
            {message}
          </p>
        )}
      </div>
    </Card>
  );
}
