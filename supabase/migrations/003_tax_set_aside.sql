-- Tax set-aside (Plus). Run once in the Supabase SQL editor on databases made
-- from an earlier schema.sql. Safe to run twice.
alter table public.users
  add column if not exists tax_set_aside_pct smallint check (tax_set_aside_pct between 1 and 50);
grant update (tax_set_aside_pct) on public.users to authenticated;
