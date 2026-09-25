"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getStore, type CheckoutStart } from "@/lib/store";
import { PRICES, type Interval, type PremiumFeature } from "@/lib/plan";
import { useData } from "./DataProvider";
import { Icon } from "./Icon";
import { Button, Dialog } from "./ui";

// Whop's checkout runs in an iframe; load it only in the browser, only when needed.
const WhopCheckoutEmbed = dynamic(() => import("@whop/checkout/react").then((m) => m.WhopCheckoutEmbed), {
  ssr: false,
});

type Ctx = { openPremium: (feature?: PremiumFeature) => void };
const PremiumContext = createContext<Ctx>({ openPremium: () => {} });
export const usePremium = () => useContext(PremiumContext);

type Step =
  | { kind: "choose" }
  | { kind: "checkout"; start: Extract<CheckoutStart, { kind: "whop" }> }
  | { kind: "processing"; slow: boolean }
  | { kind: "done" };

export function PremiumProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("premium");
  const locale = useLocale();
  const { profile, store, mutate } = useData();
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<PremiumFeature | undefined>();
  const [interval, setInterval_] = useState<Interval>("yearly");
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const polling = useRef(false);

  const openPremium = useCallback((f?: PremiumFeature) => {
    setFeature(f);
    setStep({ kind: "choose" });
    setError(null);
    setOpen(true);
  }, []);

  // After payment, Whop tells our webhook; wait for the profile to flip to Premium.
  useEffect(() => {
    if (step.kind !== "processing" || polling.current) return;
    polling.current = true;
    let tries = 0;
    const tick = async () => {
      tries++;
      await mutate(async () => {}).catch(() => {});
      const p = await (await getStore()).getProfile().catch(() => null);
      if (p?.premium) {
        polling.current = false;
        setStep({ kind: "done" });
        return;
      }
      if (tries === 10) setStep({ kind: "processing", slow: true });
      if (tries < 40) setTimeout(tick, 2000);
      else polling.current = false;
    };
    setTimeout(tick, 1500);
  }, [step, mutate]);

  async function onContinue() {
    setBusy(true);
    setError(null);
    const start = await store.startCheckout(interval);
    setBusy(false);
    if (start.kind === "whop") setStep({ kind: "checkout", start });
    else if (start.kind === "error") setError(t("unavailable"));
  }

  async function activateDemo() {
    const demo = store as unknown as { activateDemoPremium?: () => Promise<void> };
    await mutate(async () => demo.activateDemoPremium?.());
    setStep({ kind: "done" });
  }

  const title =
    feature === "goals"
      ? t("titleGoals")
      : feature === "countries"
        ? t("titleCountries")
        : feature === "export"
          ? t("titleExport")
          : t("titleGeneral");

  const dark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <PremiumContext.Provider value={{ openPremium }}>
      {children}
      <Dialog open={open} onClose={() => setOpen(false)} title={step.kind === "done" ? t("active") : title}>
        {step.kind === "choose" && (
          <>
            <p className="t-body muted">{t("lead")}</p>
            <ul className="premium-features">
              {(["featureGoals", "featureCountries", "featureExport"] as const).map((k) => (
                <li key={k} className="row">
                  <span className="premium-check">
                    <Icon name="check" size={16} />
                  </span>
                  <span className="t-body">{t(k)}</span>
                </li>
              ))}
            </ul>
            <div className="premium-plans" role="radiogroup" aria-label={t("name")}>
              <button
                type="button"
                role="radio"
                aria-checked={interval === "yearly"}
                className="premium-plan"
                onClick={() => setInterval_("yearly")}
              >
                <span className="t-label">{t("yearly")}</span>
                <span className="t-heading num">{t("perYear", { price: PRICES.yearly.label })}</span>
                <span className="t-caption premium-save">
                  {t("yearlyDetail", { perMonth: PRICES.yearly.perMonth, pct: PRICES.yearly.savingsPct })}
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={interval === "monthly"}
                className="premium-plan"
                onClick={() => setInterval_("monthly")}
              >
                <span className="t-label">{t("monthly")}</span>
                <span className="t-heading num">{t("perMonth", { price: PRICES.monthly.label })}</span>
              </button>
            </div>
            {error && (
              <p className="notice notice--alerta t-caption" role="alert">
                {error}
              </p>
            )}
            {store.mode === "demo" ? (
              <>
                <p className="t-caption muted">{t("demoNote")}</p>
                <Button block onClick={activateDemo}>
                  {t("demoActivate")}
                </Button>
              </>
            ) : (
              <Button block onClick={onContinue} disabled={busy}>
                {t("continue")}
              </Button>
            )}
            <p className="t-caption muted">{t("fineprint")}</p>
            <Button variant="ghost" block onClick={() => setOpen(false)}>
              {t("notNow")}
            </Button>
          </>
        )}

        {step.kind === "checkout" && (
          <div className="premium-checkout">
            <WhopCheckoutEmbed
              sessionId={step.start.sessionId}
              theme={dark ? "dark" : "light"}
              locale={locale}
              skipRedirect
              prefill={profile?.email ? { email: profile.email } : undefined}
              themeOptions={{ accentColor: dark ? "#5fc7b4" : "#0f6b5f", borderRadius: 12 }}
              fallback={<p className="t-body muted">…</p>}
              onComplete={() => setStep({ kind: "processing", slow: false })}
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
            <Button block onClick={() => setOpen(false)}>
              {locale === "es" ? "Listo" : "Done"}
            </Button>
          </>
        )}
      </Dialog>
    </PremiumContext.Provider>
  );
}
