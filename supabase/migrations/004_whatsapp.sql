-- WhatsApp assistant (Plus). Run once in the Supabase SQL editor on databases
-- made from an earlier schema.sql. Safe to run twice. These columns are written
-- only by the server (no update grant for people).
alter table public.users add column if not exists whatsapp_phone text unique;
alter table public.users add column if not exists whatsapp_code text;
alter table public.users add column if not exists whatsapp_code_expires timestamptz;
alter table public.users add column if not exists whatsapp_last_entries uuid[];

-- Message ids already handled, so a message Meta delivers twice is logged once.
create table if not exists public.whatsapp_messages (
  id text primary key,
  received_at timestamptz not null default now()
);
alter table public.whatsapp_messages enable row level security;
