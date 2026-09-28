-- Clara saved conversations. Run once in the Supabase SQL editor on databases
-- made from an earlier schema.sql. Safe to run twice.
alter table public.ai_questions add column if not exists conversation_id uuid;
create index if not exists ai_questions_conversation
  on public.ai_questions (user_id, conversation_id, created_at);
