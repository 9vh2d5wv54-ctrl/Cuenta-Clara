"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "./ui";

// "Put Cuenta Clara on your home screen." iPhone and iPad can't show an install
// button, so they get the two steps; Chrome (Android, computers) gets a button.
// Hidden once installed (opened from the home screen) or dismissed on this device.

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "cc-install-dismissed";

function installed(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export function InstallCard() {
  const t = useTranslations("install");
  const [mode, setMode] = useState<"hidden" | "ios" | "prompt">("hidden");
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {
      // storage blocked: still show it
    }
    if (dismissed || installed()) return;
    if (isIOS()) {
      setMode("ios");
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as PromptEvent);
      setMode("prompt");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (mode === "hidden") return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // nothing to remember with
    }
    setMode("hidden");
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setMode("hidden");
  }

  return (
    <div className="card stack-sm install-card">
      <div className="row">
        <img src="/icons/icon-192.png" alt="" width={40} height={40} className="install-card__icon" />
        <div className="grow">
          <p className="t-heading">{t("title")}</p>
          <p className="t-caption muted">{t("lead")}</p>
        </div>
      </div>
      {mode === "ios" ? (
        <ol className="t-body stack-sm install-card__steps">
          <li>{t("ios1")}</li>
          <li>{t("ios2")}</li>
          <li className="t-caption muted">{t("iosSignIn")}</li>
        </ol>
      ) : (
        <Button block onClick={install}>
          {t("button")}
        </Button>
      )}
      <Button variant="ghost" onClick={dismiss}>
        {t("dismiss")}
      </Button>
    </div>
  );
}
