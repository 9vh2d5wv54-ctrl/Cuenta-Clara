import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { USAGE_TAG_LIST } from "@/lib/ai-usage";
import { isDemo } from "@/lib/demo";
import { computeFunnel, type FunnelInput } from "@/lib/funnel";
import { peopleRows, type PeopleInput, type PersonRow } from "@/lib/people";
import { runHealthChecks, type Check } from "@/lib/health-check";
import { PushKeyMaker } from "@/components/PushKeyMaker";
import { pushConfigured } from "@/lib/push";
import { supabaseAdmin, supabaseFromCookies } from "@/lib/supabase-server";
import { isTester } from "@/lib/testers";

// Private dashboard (tester accounts only): the sign-up funnel and the health of
// the paid path. English only; it's for the team, not for users.
export const dynamic = "force-dynamic";

const RANGES = { "7": "Last 7 days", "30": "Last 30 days", all: "All time" } as const;
type Range = keyof typeof RANGES;

/** Every row of one column (Supabase returns at most 1,000 per request). */
async function all<T>(db: SupabaseClient, table: string, columns: string, filter?: (q: any) => any): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < 200_000; from += 1000) {
    let q = db.from(table).select(columns).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function load(db: SupabaseClient): Promise<FunnelInput> {
  const [users, budgets, bills, entries, questions, subs] = await Promise.all([
    all<{ id: string; email: string; created_at: string }>(db, "users", "id, email, created_at"),
    all<{ user_id: string }>(db, "budgets", "user_id", (q) => q.gt("income_cents", 0)),
    all<{ user_id: string }>(db, "bills", "user_id"),
    all<{ user_id: string }>(db, "entries", "user_id"),
    all<{ user_id: string }>(db, "ai_questions", "user_id", (q) => q.not("question", "in", USAGE_TAG_LIST)),
    all<{ user_id: string; plan: string; status: string; provider_membership_id: string | null; trial_ends_at: string | null }>(
      db,
      "subscriptions",
      "user_id, plan, status, provider_membership_id, trial_ends_at",
    ),
  ]);
  const ids = (rows: { user_id: string }[]) => new Set(rows.map((r) => r.user_id));
  return {
    users,
    setUp: new Set([...ids(budgets), ...ids(bills)]),
    logged: ids(entries),
    askedClara: ids(questions),
    trial: new Set(subs.filter((s) => s.plan === "plus" || s.provider_membership_id || s.trial_ends_at).map((s) => s.user_id)),
    paying: new Set(subs.filter((s) => s.plan === "plus" && s.status === "active").map((s) => s.user_id)),
  };
}

/** Extra data for the People list. Optional tables (push, notes) may not exist yet. */
async function loadPeople(db: SupabaseClient, funnel: FunnelInput): Promise<PeopleInput> {
  const soft = async <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
  const since = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10);
  const [users, entries, questions, notesSeen, phones] = await Promise.all([
    soft(all<{ id: string; business_on?: boolean | null }>(db, "users", "id, business_on")),
    all<{ user_id: string; date: string }>(db, "entries", "user_id, date", (q) => q.gte("date", since)),
    all<{ user_id: string; created_at: string }>(db, "ai_questions", "user_id, created_at", (q) => q.not("question", "in", USAGE_TAG_LIST)),
    soft(all<{ user_id: string; seen_at: string | null }>(db, "clara_notes", "user_id, seen_at", (q) => q.not("seen_at", "is", null))),
    soft(all<{ user_id: string }>(db, "push_subscriptions", "user_id")),
  ]);
  const biz = new Map(users.map((u) => [u.id, u.business_on]));
  return {
    users: funnel.users.map((u) => ({ ...u, business_on: biz.get(u.id) ?? false })),
    setUp: funnel.setUp,
    entries,
    questions,
    notesSeen,
    phones: new Set(phones.map((p) => p.user_id)),
    plus: funnel.trial,
  };
}

const STATUS: Record<PersonRow["status"], string> = { active: "Active", quiet: "Quiet", gone: "Gone quiet", new: "New" };

/** Sample numbers for demo mode, so the page can be seen without a database. */
function sample(): FunnelInput {
  const users = Array.from({ length: 40 }, (_, i) => ({
    id: `u${i}`,
    email: `u${i}@example.com`,
    created_at: new Date(Date.now() - i * 20 * 3600_000).toISOString(),
  }));
  const pick = (n: number) => new Set(users.slice(0, n).map((u) => u.id));
  return { users, setUp: pick(26), logged: pick(15), askedClara: pick(9), trial: pick(4), paying: pick(1) };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default async function Admin({ searchParams }: { searchParams: Promise<{ days?: string; check?: string }> }) {
  const params = await searchParams;
  const range: Range = params.days === "7" || params.days === "30" ? params.days : params.days === "all" ? "all" : "30";

  let input: FunnelInput;
  let checks: Check[] | null = null;
  let people: PersonRow[] = [];
  let error: string | null = null;
  if (isDemo) {
    input = sample();
  } else {
    const { data: auth } = await (await supabaseFromCookies()).auth.getUser();
    if (!isTester(auth.user?.email)) notFound();
    const db = supabaseAdmin();
    try {
      input = await load(db);
      people = peopleRows(await loadPeople(db, input));
    } catch (err) {
      input = { users: [], setUp: new Set(), logged: new Set(), askedClara: new Set(), trial: new Set(), paying: new Set() };
      error = err instanceof Error ? err.message : String(err);
    }
    if (params.check === "1") checks = await runHealthChecks(db);
  }

  if (isDemo) {
    people = peopleRows({ users: input.users.slice(0, 8), setUp: input.setUp, entries: [], questions: [], notesSeen: [], phones: new Set(), plus: new Set() });
  }
  const since = range === "all" ? null : new Date(Date.now() - Number(range) * 86_400_000).toISOString();
  const { steps, testers, worst } = computeFunnel(input, since, (email) => (isDemo ? false : isTester(email)));
  const max = Math.max(steps[0].count, 1);

  return (
    <main className="page admin">
      <div className="stack-sm">
        <h1 className="t-title">Dashboard</h1>
        <p className="t-body muted">Private: only tester accounts can open this page.</p>
        {isDemo && <p className="notice t-caption">Demo mode: these are sample numbers, not real people.</p>}
        {error && <p className="notice notice--alerta t-caption">Couldn&apos;t read the data: {error}</p>}
      </div>

      <nav className="chips" aria-label="Date range">
        {(Object.keys(RANGES) as Range[]).map((r) => (
          <Link key={r} href={`/app/admin?days=${r}`} className={r === range ? "chip-link chip-link--on" : "chip-link"} aria-current={r === range ? "page" : undefined}>
            {RANGES[r]}
          </Link>
        ))}
      </nav>

      <section className="card stack" aria-labelledby="funnel-title">
        <div className="stack-sm">
          <h2 id="funnel-title" className="t-heading">
            Sign-up funnel
          </h2>
          <p className="t-caption muted">
            Of the people who signed up in this period, how many reached each step.
            {testers > 0 && ` Tester accounts left out: ${testers}.`}
          </p>
        </div>
        <ol className="funnel">
          {steps.map((s, i) => (
            <li key={s.key} className="funnel__step">
              <div className="row row--between">
                <span className="t-label">{s.label}</span>
                <span className="t-label num">{s.count}</span>
              </div>
              <span className="funnel__bar" aria-hidden>
                <span style={{ width: `${(s.count / max) * 100}%` }} />
              </span>
              {i > 0 && (
                <span className="t-caption muted num">
                  {pct(s.ofPrevious)} of the step before · {pct(s.ofStart)} of sign-ups
                </span>
              )}
            </li>
          ))}
        </ol>
        {worst ? (
          <p className="notice t-body">
            <span>
              Biggest drop: <strong>{worst.from}</strong> → <strong>{worst.to}</strong> ({pct(worst.rate)} made it). Look here first.
              {worst.to.startsWith("Paying") && " Trials last 7 days, so recent trials can't be paying yet."}
            </span>
          </p>
        ) : (
          <p className="t-caption muted">The biggest drop shows once at least 5 people sign up in the period.</p>
        )}
        <p className="t-caption muted">
          Visitors to the landing page aren&apos;t counted here: see them in Meta Events Manager (the Pixel) as PageView and Lead.
        </p>
      </section>

      <section className="card stack" aria-labelledby="people-title">
        <div className="stack-sm">
          <h2 id="people-title" className="t-heading">
            People
          </h2>
          <p className="t-caption muted">
            Newest first (up to 50). Emails are shortened so screenshots stay private. Active = used it in the last 3 days; Quiet = 4–14
            days; Gone quiet = more than 14. A good time to text the quiet ones.
          </p>
        </div>
        {people.length === 0 ? (
          <p className="t-body muted">No one yet.</p>
        ) : (
          <div className="people">
            <table className="people__table">
              <thead>
                <tr>
                  <th>Who</th>
                  <th>Joined</th>
                  <th>Last used</th>
                  <th>Set up</th>
                  <th>Logged</th>
                  <th>Clara</th>
                  <th>Extras</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="people__email">{p.email}</span>
                      <span className={`people__status people__status--${p.status}`}>{STATUS[p.status]}</span>
                    </td>
                    <td className="num">{p.joinedDaysAgo === 0 ? "today" : `${p.joinedDaysAgo}d`}</td>
                    <td className="num">{p.lastActiveDaysAgo === null ? "—" : p.lastActiveDaysAgo === 0 ? "today" : `${p.lastActiveDaysAgo}d ago`}</td>
                    <td>{p.setUp ? "✓" : "—"}</td>
                    <td className="num">{p.entries}</td>
                    <td className="num">{p.questions}</td>
                    <td className="t-caption">{[p.business && "Business", p.phone && "Phone alerts", p.plus && "Plus"].filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card stack" aria-labelledby="health-title">
        <div className="stack-sm">
          <h2 id="health-title" className="t-heading">
            Health check
          </h2>
          <p className="t-caption muted">
            Runs every morning by itself and emails you only if something is broken. Run it now before starting ads. It opens a test checkout
            (no charge) and asks Clara one word (less than a cent).
          </p>
        </div>
        {checks ? (
          <ul className="health">
            {checks.map((c) => (
              <li key={c.name} className="health__row">
                <span className={c.ok ? "health__dot health__dot--ok" : "health__dot health__dot--bad"} aria-hidden>
                  {c.ok ? "✓" : "✗"}
                </span>
                <span className="grow stack-sm">
                  <span className="t-label">{c.name}</span>
                  <span className="t-caption muted">{c.detail}</span>
                </span>
                <span className="sr-only">{c.ok ? "Working" : "Broken"}</span>
              </li>
            ))}
          </ul>
        ) : isDemo ? (
          <p className="t-caption muted">Not available in demo mode.</p>
        ) : null}
        {!isDemo && (
          <Link href={`/app/admin?days=${range}&check=1`} className="btn btn--secondary btn--block">
            {checks ? "Run again" : "Run the checks now"}
          </Link>
        )}
      </section>

      <section className="card stack" aria-labelledby="push-keys-title">
        <div className="stack-sm">
          <h2 id="push-keys-title" className="t-heading">
            Phone notification key
          </h2>
          <p className="t-caption muted">
            Phone notifications need one key in Vercel (VAPID_PRIVATE_KEY). Make it here (in your browser, not sent anywhere), paste it into
            Vercel, then redeploy.
          </p>
        </div>
        <PushKeyMaker configured={pushConfigured()} />
      </section>
    </main>
  );
}
