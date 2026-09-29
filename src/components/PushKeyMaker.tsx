"use client";

import { useState } from "react";
import { Button } from "./ui";

// Tester dashboard: makes the two phone-notification keys right in this browser
// (nothing is sent anywhere). Copy each into Vercel → Settings → Environment Variables.

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function PushKeyMaker({ configured }: { configured: boolean }) {
  const [keys, setKeys] = useState<{ pub: string; priv: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function make() {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const pub = b64url(await crypto.subtle.exportKey("raw", pair.publicKey));
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    setKeys({ pub, priv: jwk.d ?? "" });
  }
  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value).catch(() => {});
    setCopied(label);
  }

  if (configured && !keys) {
    return <p className="t-caption muted">Keys are set in Vercel. Only make new ones if you need to replace them (everyone would have to turn notifications on again).</p>;
  }
  return (
    <div className="stack-sm">
      {!keys ? (
        <Button variant="secondary" block onClick={make}>
          Make notification keys
        </Button>
      ) : (
        <>
          {[
            { name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", value: keys.pub },
            { name: "VAPID_PRIVATE_KEY", value: keys.priv },
          ].map((k) => (
            <div key={k.name} className="stack-sm">
              <p className="t-label" style={{ margin: 0 }}>
                {k.name}
              </p>
              <Button variant="secondary" block onClick={() => copy(k.name, k.value)}>
                {copied === k.name ? "Copied ✓" : "Copy value"}
              </Button>
            </div>
          ))}
          <p className="t-caption muted">
            In Vercel: your project → Settings → Environment Variables → add each name with its copied value (all environments) → Save.
            Then Deployments → ⋯ → Redeploy. Don&apos;t share the private key with anyone. If you leave this page before saving both, make
            new ones.
          </p>
        </>
      )}
    </div>
  );
}
