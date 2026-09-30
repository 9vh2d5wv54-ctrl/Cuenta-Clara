// When the weekly note and summary go out: Sunday 6 PM in each person's own
// timezone. The weekly cron runs every hour on Sundays and Mondays (UTC), which
// covers Sunday evening everywhere from New Zealand to Hawaii.

export const DEFAULT_TIMEZONE = "America/New_York";

/** Is it Sunday, 6 PM (18:00–18:59) in this timezone? A missing or unknown timezone counts as New York. */
export function isSunday6pm(timeZone: string | null | undefined, now = new Date()): boolean {
  const read = (tz: string) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(now);
    return { weekday: parts.find((p) => p.type === "weekday")?.value, hour: Number(parts.find((p) => p.type === "hour")?.value) };
  };
  let at: { weekday?: string; hour: number };
  try {
    at = read(timeZone || DEFAULT_TIMEZONE);
  } catch {
    at = read(DEFAULT_TIMEZONE);
  }
  return at.weekday === "Sun" && at.hour === 18;
}

/**
 * "local" (default): each person at their own Sunday 6 PM, from an hourly cron.
 * "single": everyone on one run (set WEEKLY_LOCAL_TIME=false, with a once-a-week cron).
 */
export function weeklyMode(): "local" | "single" {
  return process.env.WEEKLY_LOCAL_TIME === "false" ? "single" : "local";
}
