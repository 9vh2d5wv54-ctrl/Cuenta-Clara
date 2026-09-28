-- Debt payoff simulator. Run once in the Supabase SQL editor on databases made
-- from an earlier schema.sql. Safe to run twice.
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  balance_cents bigint not null check (balance_cents >= 0),
  start_balance_cents bigint not null check (start_balance_cents >= 0),
  apr numeric(5, 2) not null check (apr >= 0 and apr <= 100),
  min_payment_cents bigint not null check (min_payment_cents > 0),
  created_at timestamptz not null default now()
);
alter table public.debts enable row level security;
drop policy if exists "own debts" on public.debts;
create policy "own debts" on public.debts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
