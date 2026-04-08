-- Limită de întrebări per sesiune (ca să poți juca un subset dintr-un quiz mare).

alter table public.sessions
  add column if not exists question_count int;

alter table public.sessions
  drop constraint if exists sessions_question_count_positive;

alter table public.sessions
  add constraint sessions_question_count_positive
  check (question_count is null or question_count > 0);

