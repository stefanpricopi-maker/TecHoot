-- Seed pentru ordinea random a întrebărilor per sesiune.
-- Folosit pentru shuffle determinist (host/jucători/server au aceeași ordine).

alter table public.sessions
  add column if not exists question_seed int;

alter table public.sessions
  drop constraint if exists sessions_question_seed_positive;

alter table public.sessions
  add constraint sessions_question_seed_positive
  check (question_seed is null or question_seed > 0);

