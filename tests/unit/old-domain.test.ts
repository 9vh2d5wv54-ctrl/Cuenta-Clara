import { describe, expect, it } from "vitest";
import { oldDomainRedirect } from "@/lib/old-domain";

const NEW = "https://pocketrecon.app";
const go = (u: string, site = NEW) => oldDomainRedirect(new URL(u), site)?.toString() ?? null;

describe("forwarding the old address", () => {
  it("sends pages on micuentaclara.app to the same page on pocketrecon.app", () => {
    expect(go("https://micuentaclara.app/")).toBe("https://pocketrecon.app/");
    expect(go("https://micuentaclara.app/app/negocio?x=1")).toBe("https://pocketrecon.app/app/negocio?x=1");
    expect(go("https://www.micuentaclara.app/privacidad")).toBe("https://pocketrecon.app/privacidad");
    expect(go("https://micuentaclara.app/?country=GB&lang=en")).toBe("https://pocketrecon.app/?country=GB&lang=en");
  });
  it("keeps Whop's webhook and sign-in links on the old address", () => {
    expect(go("https://micuentaclara.app/api/webhooks/whop")).toBeNull();
    expect(go("https://micuentaclara.app/auth/callback?code=abc")).toBeNull();
    expect(go("https://micuentaclara.app/auth/confirm?token_hash=abc")).toBeNull();
  });
  it("leaves the new address and Vercel addresses alone", () => {
    expect(go("https://pocketrecon.app/app")).toBeNull();
    expect(go("https://cuenta-clara-six.vercel.app/")).toBeNull();
  });
  it("does nothing until the new address is set", () => {
    expect(go("https://micuentaclara.app/", "https://micuentaclara.app")).toBeNull();
  });
});
