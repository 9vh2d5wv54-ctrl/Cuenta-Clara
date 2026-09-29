"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useData } from "./DataProvider";
import { Icon } from "./Icon";
import { Button, Toast } from "./ui";
import { SwitchRow } from "./VetNav";
import { pushState, sendTestPush, turnOffPush, turnOnPush, type PushState } from "@/lib/push-client";

/** Settings → Phone notifications: turn on for this phone, pick kinds, send a test. */
export function PushSettings() {
  const t = useTranslations("push");
  const { store, profile, mutate } = useData();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    pushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  if (state === null) return null;
  const demo = store.mode === "demo";

  async function on() {
    setBusy(true);
    try {
      const next = await turnOnPush();
      setState(next);
      if (next === "on") setToast(t("turnedOn"));
    } catch {
      setToast(t("failed"));
    } finally {
      setBusy(false);
    }
  }
  async function off() {
    setBusy(true);
    setState(await turnOffPush().catch(() => "off" as const));
    setBusy(false);
  }
  async function test() {
    setBusy(true);
    setToast((await sendTestPush()) ? t("testSent") : t("testFailed"));
    setBusy(false);
  }
  function pref(key: "push_note_on" | "push_bills_on" | "push_payday_on", value: boolean) {
    mutate((st) => st.updateProfile({ [key]: value })).catch(() => setToast(t("failed")));
  }

  return (
    <div className="stack">
      <p className="t-body muted">{t("lead")}</p>

      {demo ? (
        <p className="notice t-caption">{t("demo")}</p>
      ) : state === "unsupported" ? (
        <p className="notice t-caption">{t("unsupported")}</p>
      ) : state === "not-set-up" ? (
        <p className="notice t-caption">{t("notSetUp")}</p>
      ) : state === "needs-home-screen" ? (
        <div className="card push-steps stack-sm">
          <p className="t-label">{t("iosTitle")}</p>
          <ol className="push-steps__list t-body">
            <li>{t("ios1")}</li>
            <li>{t("ios2")}</li>
            <li>{t("ios3")}</li>
          </ol>
        </div>
      ) : state === "blocked" ? (
        <p className="notice notice--alerta t-caption">{t("blocked")}</p>
      ) : state === "off" ? (
        <Button block onClick={on} disabled={busy}>
          <Icon name="bell" size={20} />
          {t("turnOn")}
        </Button>
      ) : (
        <>
          <p className="t-label push-on">
            <Icon name="check" size={18} />
            {t("onHere")}
          </p>
          <SwitchRow label={t("note")} help={t("noteHelp")} checked={profile?.push_note_on !== false} onChange={(v) => pref("push_note_on", v)} />
          <SwitchRow label={t("bills")} help={t("billsHelp")} checked={profile?.push_bills_on !== false} onChange={(v) => pref("push_bills_on", v)} />
          <SwitchRow label={t("payday")} help={t("paydayHelp")} checked={profile?.push_payday_on !== false} onChange={(v) => pref("push_payday_on", v)} />
          <div className="push-actions">
            <Button variant="secondary" onClick={test} disabled={busy}>
              {t("test")}
            </Button>
            <Button variant="ghost" onClick={off} disabled={busy}>
              {t("turnOff")}
            </Button>
          </div>
        </>
      )}
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
