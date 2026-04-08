-- Rulare manuală în Supabase SQL Editor dacă tabelele există deja fără aceste coloane.

alter table public.sessions
  add column if not exists current_question_started_at timestamptz;

alter table public.round_responses
  add column if not exists points_earned int not null default 0;
