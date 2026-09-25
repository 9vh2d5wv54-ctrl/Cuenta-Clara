-- Cuenta Clara schema. Run once in the Supabase SQL editor.
-- All money is integer cents in USD; foreign amounts are computed at display time.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  language text not null default 'es' check (language in ('es', 'en')),
  home_country text,
  home_currency text,
  email_bills_on boolean not null default true,
  email_weekly_on boolean not null default true,
  timezone text not null default 'America/New_York',
  rate_alert_on boolean not null default false,
  rate_alert_baseline numeric,
  created_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  income_cents bigint not null check (income_cents >= 0),
  unique (user_id, month)
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  amount_cents bigint not null check (amount_cents > 0),
  due_day int not null check (due_day between 1 and 31),
  reminder_on boolean not null default true
);

create table public.recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  country text not null,
  currency text not null,
  default_amount_cents bigint not null check (default_amount_cents > 0),
  frequency text not null default 'monthly' check (frequency in ('monthly', 'biweekly'))
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('expense', 'send', 'bill_paid', 'savings')),
  amount_cents bigint not null check (amount_cents > 0),
  category text not null,
  recipient_id uuid references public.recipients (id) on delete set null,
  date date not null,
  note text
);
create index entries_user_date on public.entries (user_id, date);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  target_cents bigint not null check (target_cents > 0),
  target_date date not null,
  saved_cents bigint not null default 0 check (saved_cents >= 0)
);

-- Plus subscription, one row per user. Written only by the Whop webhook (service role).
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'plus')),
  status text not null default 'active' check (status in ('trialing', 'active', 'canceled')),
  trial_ends_at timestamptz,
  renews_at timestamptz,
  cancel_at_period_end boolean not null default false,
  provider_customer_id text,     -- Whop user id
  provider_membership_id text    -- Whop membership id, used to cancel
);

-- One saved AI money checkup per user per month.
create table public.checkups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  language text not null check (language in ('es', 'en')),
  summary_text text not null,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

-- "¿Me alcanza?" questions; counts toward the 30-a-day Plus limit.
create table public.ai_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null default current_date,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);
create index ai_questions_user_date on public.ai_questions (user_id, date);

-- Row-level security: every table is limited to its owner.
alter table public.users enable row level security;
alter table public.budgets enable row level security;
alter table public.bills enable row level security;
alter table public.recipients enable row level security;
alter table public.entries enable row level security;
alter table public.goals enable row level security;
alter table public.subscriptions enable row level security;
alter table public.checkups enable row level security;
alter table public.ai_questions enable row level security;

create policy "own profile" on public.users
  for all using (id = auth.uid()) with check (id = auth.uid());
-- People edit their settings; rate_alert_baseline and email are server-managed.
revoke update on public.users from authenticated, anon;
grant update (language, home_country, home_currency, email_bills_on, email_weekly_on, timezone, rate_alert_on)
  on public.users to authenticated;
create policy "own budgets" on public.budgets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own bills" on public.bills
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own recipients" on public.recipients
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own entries" on public.entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own goals" on public.goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Read-only for people; the server writes these.
create policy "read own subscription" on public.subscriptions
  for select using (user_id = auth.uid());
create policy "read own checkups" on public.checkups
  for select using (user_id = auth.uid());
create policy "read own questions" on public.ai_questions
  for select using (user_id = auth.uid());

-- Create the profile row when someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Add to a goal atomically.
create function public.add_to_goal(goal_id uuid, amount bigint) returns void
language sql security invoker as $$
  update public.goals set saved_cents = saved_cents + amount
  where id = goal_id and user_id = auth.uid();
$$;

-- Settings → delete account. Removing the auth user cascades to every table.
create function public.delete_my_account() returns void
language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function public.delete_my_account() from anon;


-- ── Plus ────────────────────────────────────────────────────────────────────
create function public.has_plus(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid and plan = 'plus' and status in ('trialing', 'active')
  );
$$;

-- Free plan: 1 savings goal. Enforced here as well as in the app.
create function public.enforce_goal_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_plus(new.user_id)
     and (select count(*) from public.goals where user_id = new.user_id) >= 1 then
    raise exception 'plus_required: goals' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger goals_free_limit before insert on public.goals
  for each row execute function public.enforce_goal_limit();

-- A new alert or a new currency starts from today's rate.
create function public.reset_rate_baseline() returns trigger
language plpgsql as $$
begin
  if new.rate_alert_on is distinct from old.rate_alert_on
     or new.home_currency is distinct from old.home_currency then
    new.rate_alert_baseline := null;
  end if;
  return new;
end;
$$;
create trigger users_rate_baseline before update on public.users
  for each row execute function public.reset_rate_baseline();
