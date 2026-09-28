-- Paycheck mode (Plus). Run once in the Supabase SQL editor on databases made
-- from an earlier schema.sql. Safe to run twice.
alter table public.users
  add column if not exists pay_frequency text check (pay_frequency in ('weekly', 'biweekly'));
grant update (pay_frequency) on public.users to authenticated;

alter table public.entries drop constraint if exists entries_type_check;
alter table public.entries
  add constraint entries_type_check check (type in ('expense', 'send', 'bill_paid', 'savings', 'income'));
