import { webcrypto } from "node:crypto";
import webpush from "web-push";
import { describe, expect, it } from "vitest";
import { shorten } from "@/lib/push";

const b64url = (buf: ArrayBuffer | Uint8Array) => Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString("base64url");

describe("phone notifications", () => {
  it("accepts keys made the way the dashboard makes them, and builds a signed, encrypted message", async () => {
    // Same steps as PushKeyMaker (WebCrypto in the browser).
    const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const pub = b64url(await webcrypto.subtle.exportKey("raw", pair.publicKey));
    const priv = (await webcrypto.subtle.exportKey("jwk", pair.privateKey)).d!;
    expect(() => webpush.setVapidDetails("https://micuentaclara.app", pub, priv)).not.toThrow();

    // A pretend phone subscription, like the one a browser gives.
    const phone = await webcrypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const sub = {
      endpoint: "https://web.push.apple.com/abc123",
      keys: { p256dh: b64url(await webcrypto.subtle.exportKey("raw", phone.publicKey)), auth: b64url(webcrypto.getRandomValues(new Uint8Array(16))) },
    };
    const req = webpush.generateRequestDetails(sub, JSON.stringify({ title: "Clara", body: "Hola" }));
    expect(req.headers.Authorization).toMatch(/^vapid t=.+, k=/);
    expect(req.headers["Content-Encoding"]).toBe("aes128gcm");
    expect((req.body as Buffer).length).toBeGreaterThan(0);
  });

  it("keeps lock-screen text short, cutting at a word", () => {
    expect(shorten("Short note.")).toBe("Short note.");
    const long = "You kept $1,173 from your business this month. ".repeat(6);
    const out = shorten(long);
    expect(out.length).toBeLessThanOrEqual(180);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
});

describe("key pair check", () => {
  it("knows when both keys come from the same pair", async () => {
    const make = async () => {
      const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
      return { pub: b64url(await webcrypto.subtle.exportKey("raw", pair.publicKey)), priv: (await webcrypto.subtle.exportKey("jwk", pair.privateKey)).d! };
    };
    const a = await make();
    const b = await make();
    const { keysMatch } = await import("@/lib/push");
    expect(keysMatch(a.pub, a.priv)).toBe(true);
    expect(keysMatch(` ${a.pub}\n`, a.priv)).toBe(true);
    expect(keysMatch(a.pub, b.priv)).toBe(false);
    expect(keysMatch(a.pub, "")).toBe(false);
  });
});
