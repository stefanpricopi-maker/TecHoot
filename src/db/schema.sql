-- Schema kahoot-live — PostgreSQL (Supabase)
-- Rulare: SQL Editor în dashboard Supabase sau migrări CLI.
--
-- După creare, activează Realtime pentru tabelele care trebuie propagate la clienți, de ex.:
--   alter publication supabase_realtime add table public.sessions;
--   alter publication supabase_realtime add table public.players;
--
-- Configurează Row Level Security (RLS) și politici în funcție de fluxul tău (anon vs service_role).

-- -----------------------------------------------------------------------------
-- Quiz-uri (seturi de întrebări), aliniat la specification.md §4.1
-- -----------------------------------------------------------------------------

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quizzes_created_at_idx on public.quizzes (created_at desc);

-- Întrebări: alegere multiplă, 2–4 variante, o singură corectă (§4.1)
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  prompt text not null,
  options jsonb not null,
  correct_option_index smallint not null,
  order_index int not null default 0,
  time_limit_seconds int,
  created_at timestamptz not null default now(),
  constraint questions_options_count check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) >= 2
    and jsonb_array_length(options) <= 4
  ),
  constraint questions_correct_index check (
    correct_option_index >= 0
    and correct_option_index < jsonb_array_length(options)
  ),
  constraint questions_time_limit check (
    time_limit_seconds is null or time_limit_seconds > 0
  )
);

create index questions_quiz_order_idx on public.questions (quiz_id, order_index);

-- -----------------------------------------------------------------------------
-- Sesiuni live: PIN unic pentru join (§4.1, §9)
-- -----------------------------------------------------------------------------

create type public.session_status as enum (
  'lobby',
  'question_active',
  'showing_results',
  'finished'
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete restrict,
  pin text not null,
  status public.session_status not null default 'lobby',
  current_question_id uuid references public.questions (id) on delete set null,
  current_question_index int not null default 0,
  current_question_started_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sessions_pin_format check (char_length(pin) >= 4 and char_length(pin) <= 10),
  constraint sessions_question_index_nonneg check (current_question_index >= 0)
);

create unique index sessions_pin_unique on public.sessions (pin);
create index sessions_quiz_id_idx on public.sessions (quiz_id);
create index sessions_status_idx on public.sessions (status);

-- -----------------------------------------------------------------------------
-- Jucători (participanți): legați de sesiune, scor acumulat (§4.1 scor / clasament)
-- -----------------------------------------------------------------------------

create table public.players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  display_name text not null,
  score int not null default 0,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint players_display_name_nonempty check (char_length(trim(display_name)) > 0),
  constraint players_score_nonneg check (score >= 0)
);

create index players_session_id_idx on public.players (session_id);
create index players_session_score_idx on public.players (session_id, score desc);

-- -----------------------------------------------------------------------------
-- Răspunsuri pe rundă (un răspuns / jucător / întrebare), pentru „toți au răspuns”
-- -----------------------------------------------------------------------------

create table public.round_responses (
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

create index round_responses_session_idx on public.round_responses (session_id);
create index round_responses_session_question_idx on public.round_responses (session_id, question_index);

-- Adaugă la publicația Realtime dacă vrei actualizare live pe răspunsuri:
--   alter publication supabase_realtime add table public.round_responses;

-- -----------------------------------------------------------------------------
-- Actualizare updated_at la quizzes
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger quizzes_set_updated_at
  before update on public.quizzes
  for each row
  execute procedure public.set_updated_at();
