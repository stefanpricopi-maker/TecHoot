-- Rulează întregul fișier în: Supabase Dashboard → SQL Editor → New query → Run
-- Rezolvă: "Could not find the table 'public.round_responses' in the schema cache"

-- Coloană pentru bonus de viteză (dacă lipsește)
alter table public.sessions
  add column if not exists current_question_started_at timestamptz;

-- Tabel răspunsuri pe rundă
create table if not exists public.round_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  question_index int not null,
  selected_option_index smallint not null,
  points_earned int not null default 0,
  answered_at timestamptz not null default now(),
  constraint round_responses_option_range check (
    selected_option_index >= 0 and selected_option_index <= 3
  ),
  constraint round_responses_question_index_nonneg check (question_index >= 0),
  unique (player_id, question_index)
);

create index if not exists round_responses_session_idx on public.round_responses (session_id);
create index if not exists round_responses_session_question_idx
  on public.round_responses (session_id, question_index);

-- Realtime (opțional, pentru contor gazdă live)
-- alter publication supabase_realtime add table public.round_responses;
