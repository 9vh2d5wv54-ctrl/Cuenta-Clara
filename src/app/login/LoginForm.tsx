"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getStore } from "@/lib/store";
import { isDemo } from "@/lib/demo";
import type { Locale } from "@/i18n/config";

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const params = useSearchParams();
  const signup = params.get("mode") === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(params.get("error") ? t("linkFailed") : null);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in: straight to the app.
  useEffect(() => {
    getStore().then(async (s) => {
      if (await s.currentUserId()) router.replace("/app");
    });
  }, [router]);

  function validEmail() {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    setEmailError(ok ? null : t("emailInvalid"));
    return ok;
  }

  async function afterSignIn() {
    const store = await getStore();
    // Save the language picked on the landing page to the profile.
    await store.updateProfile({ language: locale }).catch(() => {});
    const month = new Date();
    const budget = await store.getBudget(
      `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
    );
    router.replace(budget ? "/app" : "/app/setup");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validEmail()) return;
    if (!isDemo && password.length < 8) {
      setPasswordError(t("passwordShort"));
      return;
    }
    setPasswordError(null);
    setBusy(true);
    const store = await getStore();
    const result = signup
      ? await store.signUp(email.trim(), password)
      : await store.signIn(email.trim(), password);
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    if (signup && store.mode === "supabase" && !(await store.currentUserId())) {
      setSent(t("confirmSent"));
      return;
    }
    await afterSignIn();
  }

  async function onMagicLink() {
    setFormError(null);
    if (!validEmail()) return;
    setBusy(true);
    const store = await getStore();
    const result = await store.sendMagicLink(email.trim());
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    if (store.mode === "demo") {
      await afterSignIn();
      return;
    }
    setSent(t("magicSent", { email: email.trim() }));
  }

  return (
    <main className="page page--bare">
      <header className="topbar">
        <Link href="/" className="wordmark">
          Cuenta Clara
        </Link>
        <LanguageToggle />
      </header>

      <h1 className="t-title">{signup ? t("signupTitle") : t("loginTitle")}</h1>

      {isDemo && <p className="notice t-caption">{t("demoNote")}</p>}

      {sent ? (
        <p className="notice t-body" role="status">
          {sent}
        </p>
      ) : (
        <form className="stack" onSubmit={onSubmit} noValidate>
          <Field label={t("email")} error={emailError}>
            {(p) => (
              <Input
                {...p}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field label={t("password")} hint={signup ? t("passwordHint") : undefined} error={passwordError}>
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          {formError && (
            <p className="notice notice--alerta t-caption" role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" block disabled={busy}>
            {signup ? t("signupButton") : t("loginButton")}
          </Button>
          <p className="t-caption muted" style={{ textAlign: "center" }}>
            {t("or")}
          </p>
          <Button variant="secondary" block onClick={onMagicLink} disabled={busy}>
            {t("magicButton")}
          </Button>
        </form>
      )}

      <Link href={signup ? "/login" : "/login?mode=signup"} className="t-label" style={{ textAlign: "center" }}>
        {signup ? t("toLogin") : t("toSignup")}
      </Link>
    </main>
  );
}
