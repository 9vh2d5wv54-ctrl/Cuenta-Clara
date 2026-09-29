# To do at the laptop

## 1. ✓ Done: one paste in Supabase (pesos + Business mode + Clara's note)

supabase.com → Dashboard → your project → SQL Editor (the >_ icon) → + New query →
select all old text and delete it → paste everything below → Run.

You should see "Success. No rows returned." If it warns the query is "destructive",
click "Run this query": it only changes the list of currencies and adds new columns.
Nothing is deleted.

```sql
-- Dominican peso (migration 009)
alter table public.users drop constraint if exists users_currency_check;
alter table public.users
  add constraint users_currency_check check (currency in ('USD', 'CAD', 'GBP', 'DOP'));

-- Business mode (migration 010)
alter table public.users add column if not exists business_on boolean not null default false;
grant update (business_on) on public.users to authenticated;
alter table public.entries add column if not exists business boolean not null default false;
create index if not exists entries_user_business on public.entries (user_id, date) where business;

-- Weekly note from Clara (migration 011)
create table if not exists public.clara_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  week date not null,
  body text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  unique (user_id, week)
);
alter table public.clara_notes enable row level security;
drop policy if exists "own clara notes" on public.clara_notes;
create policy "own clara notes" on public.clara_notes for select using (auth.uid() = user_id);
drop policy if exists "mark clara notes seen" on public.clara_notes;
create policy "mark clara notes seen" on public.clara_notes for update using (auth.uid() = user_id);
revoke all on public.clara_notes from anon, authenticated;
grant select on public.clara_notes to authenticated;
grant update (seen_at) on public.clara_notes to authenticated;
```

Then check the boxes for 009, 010 and 011 in `docs/LAUNCH_CHECKLIST.md`.

## 2. Try it on your phone

1. Settings → Your money → turn on **Business mode**.
2. Log → **I got paid** → switch on **For my business** → type an amount → Log it.
3. It shows on Home ("Your business this month") and on the Business page.
4. Optional: Settings → Your currency → **RD$ Peso dominicano** saves, then switch back.

## 3. Get your first note from Clara now (instead of waiting for Sunday)

While signed in to the app on the laptop, open:
`https://micuentaclara.app/api/email/test?kind=note`

It writes this week's note, puts it on Home and emails it to you.
