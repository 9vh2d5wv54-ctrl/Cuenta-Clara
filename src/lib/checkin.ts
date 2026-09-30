// The 3-day check-in on Home: one quick "How's it going?" for new accounts,
// from day 3 to day 45, answered or dismissed once per device.

export const CHECKIN_FROM_DAYS = 3;
export const CHECKIN_UNTIL_DAYS = 45;
export const CHECKIN_MOODS = ["meh", "ok", "love"] as const;
export type CheckinMood = (typeof CHECKIN_MOODS)[number];

export function checkinKey(userId: string): string {
  return `pr-checkin-${userId}`;
}

/** Days since the account was made, or null if unknown. */
export function accountAgeDays(createdAt: string | null | undefined, now = new Date()): number | null {
  if (!createdAt) return null;
  const t = Date.parse(createdAt);
  return Number.isNaN(t) ? null : Math.floor((now.getTime() - t) / 86_400_000);
}

export function checkinDue(createdAt: string | null | undefined, done: boolean, now = new Date()): boolean {
  const age = accountAgeDays(createdAt, now);
  return !done && age !== null && age >= CHECKIN_FROM_DAYS && age <= CHECKIN_UNTIL_DAYS;
}
