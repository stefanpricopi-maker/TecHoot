-- Add Bible reference field to questions (e.g., "Geneza 1:1").

alter table public.questions
  add column if not exists reference text;

-- Public view: expose reference to clients (still no correct answers).
drop view if exists public.questions_public;

create view public.questions_public as
select
  q.id,
  q.quiz_id,
  q.prompt,
  q.options,
  q.question_type,
  q.reference,
  q.order_index,
  q.time_limit_seconds,
  q.created_at
from public.questions q;

grant select on public.questions_public to anon, authenticated;

grant select (id, quiz_id, prompt, options, question_type, reference, order_index, time_limit_seconds, created_at)
  on table public.questions to anon, authenticated;

