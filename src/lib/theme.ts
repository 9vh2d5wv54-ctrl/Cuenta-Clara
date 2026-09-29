// Appearance: "midnight" (navy + blue, the default), "light" (the original
// light look) or "auto" (follows the phone: Midnight at night, light by day).
// Saved in a cookie so the server paints the right colors on the first frame.

export type Theme = "midnight" | "light" | "auto";
export const THEMES: Theme[] = ["midnight", "light", "auto"];
export const THEME_COOKIE = "cc_theme";
export const DEFAULT_THEME: Theme = "midnight";

export function parseTheme(v: string | undefined | null): Theme {
  return v === "light" || v === "auto" || v === "midnight" ? v : DEFAULT_THEME;
}

/** Browser only: remember the choice and repaint right away. */
export function applyTheme(theme: Theme) {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.dataset.theme = theme;
}
