import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { LESSONS } from "@/lib/lessons";
import { WORDS } from "@/lib/glossary";
import { BENEFITS } from "@/lib/vet-benefits";
import { PRIVACY, TERMS } from "@/lib/legal";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** Every key path, with array lengths, so English and Spanish can't drift apart. */
function shape(v: Json, path = ""): string[] {
  if (Array.isArray(v)) return [`${path}[${v.length}]`, ...v.flatMap((x, i) => shape(x, `${path}[${i}]`))];
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => shape(x, path ? `${path}.${k}` : k));
  return [path];
}

describe("translations", () => {
  it("English and Spanish have exactly the same keys", () => {
    const a = new Set(shape(en as Json));
    const b = new Set(shape(es as Json));
    expect([...a].filter((k) => !b.has(k))).toEqual([]);
    expect([...b].filter((k) => !a.has(k))).toEqual([]);
  });
  it("no empty strings", () => {
    const empty = (v: Json, p = ""): string[] =>
      typeof v === "string" ? (v.trim() ? [] : [p]) : v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => empty(x as Json, `${p}.${k}`)) : [];
    expect(empty(en as Json)).toEqual([]);
    expect(empty(es as Json)).toEqual([]);
  });
});

describe("content", () => {
  it("lessons have unique slugs and both languages", () => {
    expect(new Set(LESSONS.map((l) => l.slug)).size).toBe(LESSONS.length);
    for (const l of LESSONS) expect(l.es.title && l.en.title).toBeTruthy();
  });
  it("dictionary words are unique and link only to real lessons or app pages", () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
    const slugs = new Set(LESSONS.map((l) => l.slug));
    for (const w of WORDS) {
      if (w.href?.startsWith("/aprende/")) expect(slugs.has(w.href.replace("/aprende/", ""))).toBe(true);
      else if (w.href) expect(w.href.startsWith("/app")).toBe(true);
    }
  });
  it("veteran benefits link only to official https pages", () => {
    for (const b of BENEFITS) expect(b.url).toMatch(/^https:\/\/(www\.)?(va\.gov|sba\.gov|nps\.gov)\//);
  });
  it("privacy policy and terms have the same sections in both languages", () => {
    expect(PRIVACY.en.sections.length).toBe(PRIVACY.es.sections.length);
    expect(TERMS.en.sections.length).toBe(TERMS.es.sections.length);
  });
});
