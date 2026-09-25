"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/components/Icon";
import { Button, Card } from "@/components/ui";
import { trackTrialStart } from "@/lib/analytics";
import { hadTrial, hasPlus, PRICES, type Interval } from "@/lib/plan";
import { getStore, type CheckoutStart } from "@/lib/store";

// Whop's checkout runs in an iframe; load it only in the browser, only when needed.
const WhopCheckoutEmbed = dynamic(() => import("@whop/checkout/react").then((m) => m.WhopCheckoutEmbed), {
  ssr: false,
});

type Step =
  | { kind: "choose" }
  | { kind: "checkout"; start: Extract<CheckoutStart, { kind: "whop" }> }
  | { kind: "processing"; slow: boolean }
  | { kind: "done" };

// Screen 10: Plus. PRD paywall rules: only after the first checkup, prices side by
// side with the yearly saving stated plainly, plain cancel terms, no fake urgency.
export default function PlusPage() {
  const t = useTranslations("plus");
  const c = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { store, profile, subscription, hasCheckup, mutate } = useData();
  const [interval, setInterval_] = useState<Interval>("yearly");
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const polling = useRef(false);

  // Before the first checkup there is no paywall; send them to get it.
  useEffect(() => {
    if (!hasCheckup) router.replace("/app/chequeo");
  }, [hasCheckup, router]);

  // After payment, Whop tells our webhook; wait for the subscription to flip.
  useEffect(() => {
    if (step.kind !== "processing" || polling.current) return;
    polling.current = true;
    let tries = 0;
    const tick = async () => {
      tries++;
      const sub = await (await getStore()).getSubscription().catch(() => null);
      if (hasPlus(sub)) {
        polling.current = false;
        await mutate(async () => {});
        setStep({ kind: "done" });
        return;
      }
      if (tries === 10) setStep({ kind: "processing", slow: true });
      if (tries < 40) setTimeout(tick, 2000);
      else polling.current = false;
    };
    setTimeout(tick, 1500);
  }, [step, mutate]);

  if (!hasCheckup) return null;

  const trial = !hadTrial(subscription);
  const price = interval === "yearly" ? t("perYear", { price: PRICES.yearly.label }) : t("perMonth", { price: PRICES.monthly.label });

  async function onStart() {
    setBusy(true);
    setError(null);
    const start = await store.startCheckout(interval);
    setBusy(false);
    if (start.kind === "whop") setStep({ kind: "checkout", start });
    else if (start.kind === "demo") {
      const demo = store as unknown as { startDemoTrial: () => Promise<void> };
      await mutate(() => demo.startDemoTrial());
      trackTrialStart(interval);
      setStep({ kind: "done" });
    } else setError(t("unavailable"));
  }

  if (hasPlus(subscription) && step.kind === "choose") {
    return (
      <main className="page">
        <h1 className="t-title">{t("active")}</h1>
        <Link href="/app/chequeo" className="btn btn--primary btn--block">
          {c("done")}
        </Link>
      </main>
    );
  }

  const rows: [string, string][] = [
    [t("rowBudget"), t("rowBudgetPlus")],
    [t("rowCheckup"), t("rowForecast")],
    [t("rowGoals"), t("rowGoalsPlus")],
    [t("rowSends"), t("rowRates")],
    [t("rowReminders"), t("rowAsk")],
  ];
  const dark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <main className="page">
      <div className="stack-sm">
        <span className="plus-badge t-caption">{t("badge")}</span>
        <h1 className="t-title">{t("title")}</h1>
        <p className="t-body muted">{t("lead")}</p>
      </div>

      {step.kind === "choose" && (
        <>
          <Card>
            <table className="compare">
              <thead>
                <tr>
                  <th scope="col">{t("colFree")}</th>
                  <th scope="col">{t("colPlus")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([free, plus]) => (
                  <tr key={free}>
                    <td>{free}</td>
                    <td>
                      <span className="compare__plus">
                        <Icon name="check" size={16} />
                        {plus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="plus-plans" role="radiogroup" aria-label={t("name")}>
            <button
              type="button"
              role="radio"
              aria-checked={interval === "monthly"}
              className="plus-plan"
              onClick={() => setInterval_("monthly")}
            >
              <span className="t-label">{t("monthly")}</span>
              <span className="t-heading num">{t("perMonth", { price: PRICES.monthly.label })}</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={interval === "yearly"}
              className="plus-plan"
              onClick={() => setInterval_("yearly")}
            >
              <span className="t-label">{t("yearly")}</span>
              <span className="t-heading num">{t("perYear", { price: PRICES.yearly.label })}</span>
              <span className="t-caption plus-save">
                {t("yearlySave", { perMonth: PRICES.yearly.perMonth, pct: PRICES.yearly.savingsPct })}
              </span>
            </button>
          </div>

          {error && (
            <p className="notice notice--alerta t-caption" role="alert">
              {error}
            </p>
          )}
          {store.mode === "demo" && <p className="t-caption muted">{t("demoNote")}</p>}
          <Button block onClick={onStart} disabled={busy}>
            {store.mode === "demo" ? t("demoTrial") : trial ? t("trialButton") : t("startButton")}
          </Button>
          <p className="t-caption muted">{trial ? t("terms", { price }) : t("termsNoTrial")}</p>
          <Button variant="ghost" block onClick={() => router.back()}>
            {t("notNow")}
          </Button>
        </>
      )}

      {step.kind === "checkout" && (
        <div className="plus-checkout">
          <WhopCheckoutEmbed
            sessionId={step.start.sessionId}
            theme={dark ? "dark" : "light"}
            locale={locale}
            skipRedirect
            prefill={profile?.email ? { email: profile.email } : undefined}
            themeOptions={{ accentColor: dark ? "#5fc7b4" : "#0f6b5f", borderRadius: 12 }}
            fallback={<p className="t-body muted">{c("loading")}</p>}
            onComplete={() => {
              trackTrialStart(interval);
              setStep({ kind: "processing", slow: false });
            }}
          />
        </div>
      )}

      {step.kind === "processing" && (
        <p className="t-body" role="status">
          {step.slow ? t("processingSlow") : t("processing")}
        </p>
      )}

      {step.kind === "done" && (
        <>
          <p className="t-body" role="status">
            {t("success")}
          </p>
          <Link href="/app/chequeo" className="btn btn--primary btn--block">
            {c("done")}
          </Link>
        </>
      )}
    </main>
  );
}
