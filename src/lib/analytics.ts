// Landing page measurement. Plausible (page views, scroll depth, CTA clicks) and the
// Meta Pixel load only when their env vars are set, so this is a no-op until then.

type Props = Record<string, string>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function lang(): string {
  return document.documentElement.lang || "es";
}

export function trackCtaClick(placement: string) {
  window.plausible?.("CTA click", { props: { placement, lang: lang() } });
}

/** Revenue target in the PRD: 3% of users who finish a checkup start a Plus trial. */
export function trackTrialStart(interval: string) {
  window.plausible?.("Plus trial start", { props: { interval, lang: lang() } });
  window.fbq?.("track", "StartTrial");
}

export function trackSignup() {
  window.plausible?.("Signup", { props: { lang: lang() } });
  window.fbq?.("track", "CompleteRegistration");
}
