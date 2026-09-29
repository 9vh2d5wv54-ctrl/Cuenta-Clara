// Browser side of phone notifications: what this phone can do, and turning it on/off.

export type PushState =
  | "unsupported" // this browser can't do push
  | "needs-home-screen" // iPhone/iPad: only works from the Home Screen app
  | "not-set-up" // the app has no push keys yet
  | "blocked" // the person said no in the phone's prompt
  | "off"
  | "on";

let keyPromise: Promise<string | null> | null = null;
/** The app's public push key, from the server (null when notifications aren't set up). */
function serverKey(): Promise<string | null> {
  keyPromise ??= fetch("/api/push/key")
    .then((r) => r.json() as Promise<{ key: string | null }>)
    .then((b) => b.key)
    .catch(() => null);
  return keyPromise;
}

function sameKey(sub: PushSubscription, key: string): boolean {
  const current = sub.options?.applicationServerKey;
  if (!current) return true;
  const a = new Uint8Array(current);
  const b = keyBytes(key);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function standalone(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (isIOS() && !standalone()) return "needs-home-screen";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  const key = await serverKey();
  if (!key) return "not-set-up";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  // Signed up with an old key: that sign-up can't receive anything; start over.
  if (sub && !sameKey(sub, key)) {
    await turnOffPush();
    return "off";
  }
  return sub ? "on" : "off";
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function deviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Browser";
}

/** Asks permission (must follow a tap), signs this phone up and saves it. */
export async function turnOnPush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const key = await serverKey();
  if (!key) return "not-set-up";
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub, key)) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  const res = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), device: deviceName() }),
  });
  if (!res.ok) {
    await sub.unsubscribe().catch(() => {});
    throw new Error(`save failed ${res.status}`);
  }
  return "on";
}

export async function turnOffPush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return "off";
}

export async function sendTestPush(): Promise<boolean> {
  const res = await fetch("/api/push/test", { method: "POST" }).catch(() => null);
  const body = (await res?.json().catch(() => null)) as { ok?: boolean } | null;
  return Boolean(body?.ok);
}
