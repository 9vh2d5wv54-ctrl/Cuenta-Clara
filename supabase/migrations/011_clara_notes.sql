-- Weekly note from Clara: one short, personal note a week, written from the
-- person's own numbers. Shown on Home and at the top of the weekly email.
-- Written only by the server (cron); people can read theirs and mark it seen.
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
