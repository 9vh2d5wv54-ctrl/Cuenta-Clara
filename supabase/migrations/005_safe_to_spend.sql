-- Safe to Spend (free). Run once in the Supabase SQL editor on databases made
-- from an earlier schema.sql. Safe to run twice.
alter table public.users add column if not exists balance_cents bigint;
alter table public.users add column if not exists balance_on date;
alter table public.users add column if not exists buffer_cents bigint not null default 0 check (buffer_cents >= 0);
alter table public.users add column if not exists payday_anchor date;
alter table public.users add column if not exists payday_cycle text check (payday_cycle in ('weekly', 'biweekly', 'semimonthly', 'monthly'));
grant update (balance_cents, balance_on, buffer_cents, payday_anchor, payday_cycle) on public.users to authenticated;
