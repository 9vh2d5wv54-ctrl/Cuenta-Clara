# To do at the laptop

(Done: pesos, Business mode and Clara's note SQL.)

## Phone notifications (about 10 minutes)

### 1. ✓ Done: one paste in Supabase

supabase.com → Dashboard → your project → SQL Editor (>_) → + New query → delete any
old text → paste everything below → Run. You should see "Success. No rows returned."

```sql
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.users add column if not exists push_note_on boolean not null default true;
alter table public.users add column if not exists push_bills_on boolean not null default true;
alter table public.users add column if not exists push_payday_on boolean not null default true;
grant update (push_note_on, push_bills_on, push_payday_on) on public.users to authenticated;
```

### 2. The notification key (only one now)

The app only needs `VAPID_PRIVATE_KEY` in Vercel; it works out the public key itself.
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is no longer used (you can delete it in Vercel).

Check it: open `https://micuentaclara.app/api/push/test` in Safari (signed in).
- `"private_key_valid": true` → nothing to change in Vercel.
- `false` → `/app/admin` → Make the notification key → Copy the key → Vercel →
  Environment Variables → VAPID_PRIVATE_KEY → ⋯ → Edit → paste → Save → Redeploy.

### 3. Check, then turn them on on your iPhone

0. Open `https://micuentaclara.app/app/admin` → **Run the checks now** → the
   "Phone notifications" row should say **Ready**. If it says "table is missing", do
   step 1 (the SQL) first.

1. In Safari, open micuentaclara.app → Share button → **Add to Home Screen** → Add
   (skip if Cuenta Clara is already on your Home Screen).
2. Open Cuenta Clara **from the Home Screen icon** → Settings → **Phone notifications**
   → **Turn on notifications** → Allow.
3. Tap **Send a test**. A notification from Clara should show up in a few seconds.
4. Optional: `/app/admin` → Run the checks now → "Phone notifications: Ready. 1 phone
   signed up".
