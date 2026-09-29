-- Each person's own currency: US dollar (default), Canadian dollar or British pound.
alter table public.users
  add column if not exists currency text not null default 'USD'
  check (currency in ('USD', 'CAD', 'GBP'));

-- People can change it themselves in Settings.
grant update (currency) on public.users to authenticated;

-- A new currency (like a new home currency) restarts the exchange-rate alert from today's rate.
create or replace function public.reset_rate_baseline() returns trigger
language plpgsql as $$
begin
  if new.rate_alert_on is distinct from old.rate_alert_on
     or new.home_currency is distinct from old.home_currency
     or new.currency is distinct from old.currency then
    new.rate_alert_baseline := null;
  end if;
  return new;
end;
$$;
