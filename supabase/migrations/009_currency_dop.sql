-- Adds the Dominican peso (RD$) as a currency people can pick.
alter table public.users drop constraint if exists users_currency_check;
alter table public.users
  add constraint users_currency_check check (currency in ('USD', 'CAD', 'GBP', 'DOP'));
