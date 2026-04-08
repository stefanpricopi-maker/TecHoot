-- Production RLS + cleanup helpers for kahoot-live
-- Run in Supabase SQL editor after schema + seeds.

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

create or replace function public.is_session_joinable(s public.sessions)
returns boolean
language sql
stable
as $$
  select
    s.status <> 'finished'
    and s.ended_at is null
    and (s.expires_at is null or s.expires_at > now());
$$;

create or replace function public.is_quiz_active(qid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.sessions s
    where s.quiz_id = qid
      and public.is_session_joinable(s)
      and s.status in ('lobby','question_active','showing_results')
  );
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS
-- -----------------------------------------------------------------------------

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.sessions enable row level security;
alter table public.players enable row level security;
alter table public.round_responses enable row level security;

-- -----------------------------------------------------------------------------
-- Policies: QUIZZES (public read)
-- -----------------------------------------------------------------------------

drop policy if exists "quizzes_select_public" on public.quizzes;
create policy "quizzes_select_public"
  on public.quizzes
  for select
  to anon, authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- Policies + column privileges: QUESTIONS
--
-- We allow selecting questions for ACTIVE quizzes only, but we prevent leaking
-- the correct answer by revoking column-level SELECT on `correct_option_index`
-- from anon/authenticated.
-- -----------------------------------------------------------------------------

drop policy if exists "questions_select_active_quiz_only" on public.questions;
create policy "questions_select_active_quiz_only"
  on public.questions
  for select
  to anon, authenticated
  using (public.is_quiz_active(quiz_id));

-- Column-level hardening (prevents clients from selecting correct answers).
revoke all on table public.questions from anon, authenticated;
grant select (id, quiz_id, prompt, options, order_index, time_limit_seconds, created_at)
  on table public.questions to anon, authenticated;
revoke select (correct_option_index) on table public.questions from anon, authenticated;

-- Ensure view exists (created in 013); safe if rerun.
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

grant select on public.questions_public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Policies: SESSIONS
-- -----------------------------------------------------------------------------

drop policy if exists "sessions_select_public" on public.sessions;
create policy "sessions_select_public"
  on public.sessions
  for select
  to anon, authenticated
  using (true);

-- In production, clients should not update session status directly.
drop policy if exists "sessions_update_denied" on public.sessions;
create policy "sessions_update_denied"
  on public.sessions
  for update
  to anon, authenticated
  using (false)
  with check (false);

-- Allow inserts only if you want anyone to create sessions from client.
-- (Your app creates sessions from Server Actions using service_role, so this is optional.)
drop policy if exists "sessions_insert_public" on public.sessions;
create policy "sessions_insert_public"
  on public.sessions
  for insert
  to anon, authenticated
  with check (false);

-- -----------------------------------------------------------------------------
-- Policies: PLAYERS
-- -----------------------------------------------------------------------------

drop policy if exists "players_select_public" on public.players;
create policy "players_select_public"
  on public.players
  for select
  to anon, authenticated
  using (true);

drop policy if exists "players_insert_joinable_session" on public.players;
create policy "players_insert_joinable_session"
  on public.players
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.sessions s
      where s.id = players.session_id
        and public.is_session_joinable(s)
    )
  );

drop policy if exists "players_update_denied" on public.players;
create policy "players_update_denied"
  on public.players
  for update
  to anon, authenticated
  using (false)
  with check (false);

-- -----------------------------------------------------------------------------
-- Policies: ROUND_RESPONSES
-- -----------------------------------------------------------------------------

drop policy if exists "round_responses_select_public" on public.round_responses;
create policy "round_responses_select_public"
  on public.round_responses
  for select
  to anon, authenticated
  using (true);

drop policy if exists "round_responses_insert_guarded" on public.round_responses;
create policy "round_responses_insert_guarded"
  on public.round_responses
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.players p
      join public.sessions s on s.id = p.session_id
      where p.id = round_responses.player_id
        and s.id = round_responses.session_id
        and s.status = 'question_active'
        and s.current_question_started_at is not null
        and public.is_session_joinable(s)
    )
  );

-- -----------------------------------------------------------------------------
-- Realtime publication (best-effort, idempotent)
-- -----------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.sessions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.round_responses;
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Cleanup helper (service_role only)
-- -----------------------------------------------------------------------------

create or replace function public.cleanup_old_data(
  p_older_than interval default interval '2 days'
)
returns table(deleted_sessions int)
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  delete from public.sessions s
  where
    (s.ended_at is not null and s.ended_at < now() - p_older_than)
    or (s.expires_at is not null and s.expires_at < now() - p_older_than)
    or (s.status = 'lobby' and s.created_at < now() - p_older_than);

  get diagnostics n = row_count;
  deleted_sessions := n;
  return next;
end;
$$;

revoke all on function public.cleanup_old_data(interval) from public;
grant execute on function public.cleanup_old_data(interval) to service_role;

