# To do at the laptop

## 1. One paste in Supabase (pesos + Business mode)

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
```

Then check the two boxes for 009 and 010 in `docs/LAUNCH_CHECKLIST.md`.

## 2. Try it on your phone

1. Settings → Your money → turn on **Business mode**.
2. Log → **I got paid** → switch on **For my business** → type an amount → Log it.
3. It shows on Home ("Your business this month") and on the Business page.
4. Optional: Settings → Your currency → **RD$ Peso dominicano** saves, then switch back.
