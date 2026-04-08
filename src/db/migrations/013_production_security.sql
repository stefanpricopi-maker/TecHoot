-- Production security hardening:
-- - add admin_key to sessions
-- - create public view for questions without correct answer
-- - (RLS policies should be applied separately or in same file if you prefer)

alter table public.sessions
  add column if not exists admin_key uuid not null default gen_random_uuid();

create index if not exists sessions_admin_key_idx on public.sessions (admin_key);

create or replace view public.questions_public as
select
  q.id,
  q.quiz_id,
  q.prompt,
  q.options,
  q.order_index,
  q.time_limit_seconds,
  q.created_at
from public.questions q;

