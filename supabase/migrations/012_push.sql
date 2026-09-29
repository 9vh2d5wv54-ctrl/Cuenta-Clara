-- Phone notifications (web push). One row per phone or browser that turned them
-- on; people manage their own rows. Which kinds they want lives on users.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.users add column if not exists push_note_on boolean not null default true;
alter table public.users add column if not exists push_bills_on boolean not null default true;
alter table public.users add column if not exists push_payday_on boolean not null default true;
grant update (push_note_on, push_bills_on, push_payday_on) on public.users to authenticated;
