-- Business mode: people with a side hustle, gig work or self-employed pay can
-- mark income and spending as "business" and see what they actually kept.
alter table public.users add column if not exists business_on boolean not null default false;
grant update (business_on) on public.users to authenticated;

alter table public.entries add column if not exists business boolean not null default false;
create index if not exists entries_user_business on public.entries (user_id, date) where business;
