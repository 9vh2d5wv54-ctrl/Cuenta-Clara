// The People list on the private dashboard: one row per person, newest first,
// with how far they got and when they last did something. Pure, so it's tested.

export type PeopleInput = {
  users: { id: string; email: string; created_at: string; business_on?: boolean | null }[];
  setUp: Set<string>;
  entries: { user_id: string; date: string }[];
  questions: { user_id: string; created_at: string }[];
  notesSeen: { user_id: string; seen_at: string | null }[];
  phones: Set<string>;
  plus: Set<string>;
};

export type PersonRow = {
  id: string;
  email: string; // masked
  joinedDaysAgo: number;
  setUp: boolean;
  entries: number;
  questions: number;
  lastActiveDaysAgo: number | null;
  business: boolean;
  phone: boolean;
  plus: boolean;
  status: "active" | "quiet" | "gone" | "new";
};

/** "manny@gmail.com" → "ma•••@gmail.com", so screenshots of the dashboard don't expose emails. */
export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "•••";
  return `${name.slice(0, 2)}•••@${domain}`;
}

const days = (from: string, now: Date) => Math.max(0, Math.floor((now.getTime() - Date.parse(from)) / 86_400_000));

export function peopleRows(input: PeopleInput, now = new Date(), limit = 50): PersonRow[] {
  const count = (rows: { user_id: string }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
    return m;
  };
  const latest = new Map<string, string>();
  const bump = (id: string, when: string | null | undefined) => {
    if (when && (!latest.has(id) || when > latest.get(id)!)) latest.set(id, when);
  };
  for (const e of input.entries) bump(e.user_id, `${e.date}T12:00:00Z`);
  for (const q of input.questions) bump(q.user_id, q.created_at);
  for (const n of input.notesSeen) bump(n.user_id, n.seen_at);
  const entries = count(input.entries);
  const questions = count(input.questions);

  return [...input.users]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((u) => {
      const last = latest.get(u.id);
      const lastActiveDaysAgo = last ? days(last, now) : null;
      const joinedDaysAgo = days(u.created_at, now);
      // Someone who never used it counts from the day they joined.
      const idle = lastActiveDaysAgo ?? joinedDaysAgo;
      const status: PersonRow["status"] =
        lastActiveDaysAgo === null && joinedDaysAgo < 3 ? "new" : lastActiveDaysAgo !== null && idle <= 3 ? "active" : idle <= 14 ? "quiet" : "gone";
      return {
        id: u.id,
        email: maskEmail(u.email),
        joinedDaysAgo,
        setUp: input.setUp.has(u.id),
        entries: entries.get(u.id) ?? 0,
        questions: questions.get(u.id) ?? 0,
        lastActiveDaysAgo,
        business: Boolean(u.business_on),
        phone: input.phones.has(u.id),
        plus: input.plus.has(u.id),
        status,
      };
    });
}
