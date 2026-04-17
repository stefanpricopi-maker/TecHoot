-- Team mode + new question types (true/false, multi-select)
-- Run after base schema + production RLS migrations.

-- -----------------------------------------------------------------------------
-- Questions: add type + multi-select correct indices
-- -----------------------------------------------------------------------------

-- Postgres does not allow subqueries in CHECK constraints.
-- We use IMMUTABLE helper functions instead (CHECK can call functions).
create or replace function public.jsonb_int_array_all_in_bounds(
  arr jsonb,
  upper_exclusive int
)
returns boolean
language sql
immutable
as $$
  select
    arr is not null
    and jsonb_typeof(arr) = 'array'
    and jsonb_array_length(arr) >= 1
    and (
      select coalesce(bool_and(
        jsonb_typeof(v) = 'number'
        and (v::text)::int >= 0
        and (v::text)::int < upper_exclusive
      ), false)
      from jsonb_array_elements(arr) as e(v)
    );
$$;

alter table public.questions
  add column if not exists question_type text not null default 'single';

alter table public.questions
  add column if not exists correct_option_indices jsonb;

-- Constrain question_type values
alter table public.questions
  drop constraint if exists questions_question_type_check;
alter table public.questions
  add constraint questions_question_type_check
  check (question_type in ('single', 'true_false', 'multi_select'));

-- For true/false enforce 2 options
alter table public.questions
  drop constraint if exists questions_true_false_two_options_check;
alter table public.questions
  add constraint questions_true_false_two_options_check
  check (
    question_type <> 'true_false'
    or jsonb_array_length(options) = 2
  );

-- For multi-select: require non-empty int array within bounds
alter table public.questions
  drop constraint if exists questions_multi_select_correct_indices_check;
alter table public.questions
  add constraint questions_multi_select_correct_indices_check
  check (
    question_type <> 'multi_select'
    or (
      public.jsonb_int_array_all_in_bounds(
        correct_option_indices,
        jsonb_array_length(options)
      )
    )
  );

-- For non-multi-select, keep correct_option_indices null (avoid ambiguity)
alter table public.questions
  drop constraint if exists questions_non_multi_correct_indices_null_check;
alter table public.questions
  add constraint questions_non_multi_correct_indices_null_check
  check (
    question_type = 'multi_select'
    or correct_option_indices is null
  );

-- For multi-select, correct_option_index is ignored (but keep it for backward compat)

-- -----------------------------------------------------------------------------
-- Round responses: add multi-select selections
-- -----------------------------------------------------------------------------

alter table public.round_responses
  add column if not exists selected_option_indices jsonb;

-- Keep old constraint but allow multi-select indices too
alter table public.round_responses
  drop constraint if exists round_responses_option_range;
alter table public.round_responses
  add constraint round_responses_option_range
  check (
    -- legacy single-choice
    (selected_option_index is not null and selected_option_index >= 0 and selected_option_index <= 3)
    or
    -- multi-select: array of ints each in range 0..3
    (
      public.jsonb_int_array_all_in_bounds(selected_option_indices, 4)
    )
  );

-- Ensure at least one of the two fields is present
alter table public.round_responses
  drop constraint if exists round_responses_selected_present_check;
alter table public.round_responses
  add constraint round_responses_selected_present_check
  check (selected_option_index is not null or selected_option_indices is not null);

-- -----------------------------------------------------------------------------
-- Sessions: team mode flag
-- -----------------------------------------------------------------------------

alter table public.sessions
  add column if not exists team_mode boolean not null default false;

-- -----------------------------------------------------------------------------
-- Teams + player team assignment
-- -----------------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint teams_name_nonempty check (char_length(trim(name)) > 0)
);

create index if not exists teams_session_id_idx on public.teams (session_id);

alter table public.players
  add column if not exists team_id uuid references public.teams (id) on delete set null;

create index if not exists players_team_id_idx on public.players (team_id);

-- -----------------------------------------------------------------------------
-- RLS: Teams are readable in-game (mutations via service_role only)
-- -----------------------------------------------------------------------------

alter table public.teams enable row level security;

drop policy if exists "teams_select_public" on public.teams;
create policy "teams_select_public"
  on public.teams
  for select
  to anon, authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- Questions public view: include question_type (no correct answers)
-- -----------------------------------------------------------------------------

-- `CREATE OR REPLACE VIEW` cannot change existing view column names/order in-place.
-- Drop + recreate to safely add `question_type`.
drop view if exists public.questions_public;

create view public.questions_public as
select
  q.id,
  q.quiz_id,
  q.prompt,
  q.options,
  q.question_type,
  q.order_index,
  q.time_limit_seconds,
  q.created_at
from public.questions q;

grant select on public.questions_public to anon, authenticated;

-- If you use column-level grants on `public.questions`, ensure `question_type` is selectable.
grant select (id, quiz_id, prompt, options, question_type, order_index, time_limit_seconds, created_at)
  on table public.questions to anon, authenticated;

