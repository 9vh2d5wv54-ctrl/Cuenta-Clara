-- Cuenta Clara schema. Run once in the Supabase SQL editor.
-- All money is integer cents in USD; foreign amounts are computed at display time.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  language text not null default 'es' check (language in ('es', 'en')),
  home_country text,
  home_currency text,
  reminders_on boolean not null default true,
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

-- Row-level security: every table is limited to its owner.
alter table public.users enable row level security;
alter table public.budgets enable row level security;
alter table public.bills enable row level security;
alter table public.recipients enable row level security;
alter table public.entries enable row level security;
alter table public.goals enable row level security;

create policy "own profile" on public.users
  for all using (id = auth.uid()) with check (id = auth.uid());
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

-- Create the profile row when someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
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
