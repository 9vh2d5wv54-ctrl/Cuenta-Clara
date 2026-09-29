"use client";

import { useState } from "react";
import { Button } from "./ui";

// Tester dashboard: makes the phone-notification key right in this browser
// (nothing is sent anywhere). Only the private key goes in Vercel; the app works
// out the public key from it, so they can never mismatch.

export function PushKeyMaker({ configured }: { configured: boolean }) {
  const [key, setKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function make() {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    setKey(jwk.d ?? null);
    setCopied(false);
  }
  async function copy() {
    if (!key) return;
    await navigator.clipboard.writeText(key).catch(() => {});
    setCopied(true);
  }

  if (configured && !key) {
    return (
      <p className="t-caption muted">
        The key is set in Vercel. Only make a new one if you need to replace it (everyone would have to turn notifications on again).
      </p>
    );
  }
  return (
    <div className="stack-sm">
      {!key ? (
        <Button variant="secondary" block onClick={make}>
          Make the notification key
        </Button>
      ) : (
        <>
          <p className="t-label" style={{ margin: 0 }}>
            VAPID_PRIVATE_KEY
          </p>
          <Button variant="secondary" block onClick={copy}>
            {copied ? "Copied ✓" : "Copy the key"}
          </Button>
          <p className="t-caption muted">
            In Vercel: your project → Settings → Environment Variables → VAPID_PRIVATE_KEY (Secret) → paste → Save. Then redeploy. Only
            this one key is needed. Don&apos;t share it with anyone.
          </p>
        </>
      )}
    </div>
  );
}
