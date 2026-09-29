import type { IconName } from "@/components/Icon";

// How a goal looks on Home and Goals: an icon picked from its name, and one of
// three colors so goals next to each other are easy to tell apart.

export type GoalTone = "positive" | "clara" | "violet";
const TONES: GoalTone[] = ["positive", "clara", "violet"];

const ICONS: [RegExp, IconName][] = [
  [/casa|home|house|hogar|vivienda|apartament|apartment|renta|rent/i, "home"],
  [/emergen|colch[oó]n|cushion|rainy/i, "shield"],
  [/viaje|trip|travel|vacacion|vacation|visit/i, "globe"],
  [/familia|family|mam[aá]|mom|pap[aá]|dad|boda|wedding|beb[eé]|baby/i, "heart"],
  [/cumple|birthday|navidad|christmas|fiesta|party/i, "calendar"],
];

export function goalLook(name: string, index: number): { icon: IconName; tone: GoalTone } {
  const icon = ICONS.find(([re]) => re.test(name))?.[1] ?? "target";
  return { icon, tone: TONES[index % TONES.length] };
}

/** A small cheer at 25%, 50% and 75%, or null. */
export function milestone(pct: number): "start" | "half" | "almost" | null {
  if (pct >= 1) return null;
  if (pct >= 0.75) return "almost";
  if (pct >= 0.5) return "half";
  if (pct >= 0.25) return "start";
  return null;
}

/** Whole months until the target date (0 when it's this month or past). */
export function monthsLeft(targetISO: string, from = new Date()): number {
  const [y, m] = targetISO.split("-").map(Number);
  return Math.max(0, (y - from.getFullYear()) * 12 + (m - 1 - from.getMonth()));
}
