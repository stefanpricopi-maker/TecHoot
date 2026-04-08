-- Tabel quizzes (dacă lipsește) + RLS pentru citire anon pe quizzes și questions.
-- Necesar ca gazda și jucătorii să poată lista quiz-uri și întrebările sesiunii.

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quizzes_created_at_idx on public.quizzes (created_at desc);

alter table public.quizzes enable row level security;

drop policy if exists "quizzes_select_anon" on public.quizzes;
create policy "quizzes_select_anon"
  on public.quizzes
  for select
  using (true);

-- Întrebări: lectură pentru afișare în joc (presupune că tabelul questions există deja).
alter table public.questions enable row level security;

drop policy if exists "questions_select_anon" on public.questions;
create policy "questions_select_anon"
  on public.questions
  for select
  using (true);
