-- RLS public (MVP): oricine cu link poate host/join.
-- ATENȚIE: Aceste politici sunt permisive. Pentru producție, restrânge cu autentificare / ownership.

-- QUIZZES + QUESTIONS: doar citire
alter table public.quizzes enable row level security;
drop policy if exists "quizzes_select_public" on public.quizzes;
create policy "quizzes_select_public"
  on public.quizzes
  for select
  to anon, authenticated
  using (true);

alter table public.questions enable row level security;
drop policy if exists "questions_select_public" on public.questions;
create policy "questions_select_public"
  on public.questions
  for select
  to anon, authenticated
  using (true);

-- SESSIONS: citire + creare + update de stare (host flow)
alter table public.sessions enable row level security;

drop policy if exists "sessions_select_public" on public.sessions;
create policy "sessions_select_public"
  on public.sessions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "sessions_insert_public" on public.sessions;
create policy "sessions_insert_public"
  on public.sessions
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "sessions_update_public" on public.sessions;
create policy "sessions_update_public"
  on public.sessions
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- PLAYERS: citire + join (insert) + update score (server action)
alter table public.players enable row level security;

drop policy if exists "players_select_public" on public.players;
create policy "players_select_public"
  on public.players
  for select
  to anon, authenticated
  using (true);

drop policy if exists "players_insert_public" on public.players;
create policy "players_insert_public"
  on public.players
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "players_update_public" on public.players;
create policy "players_update_public"
  on public.players
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- ROUND_RESPONSES: citire + insert (contor live + submitAnswer)
alter table public.round_responses enable row level security;

drop policy if exists "round_responses_select_public" on public.round_responses;
create policy "round_responses_select_public"
  on public.round_responses
  for select
  to anon, authenticated
  using (true);

drop policy if exists "round_responses_insert_public" on public.round_responses;
create policy "round_responses_insert_public"
  on public.round_responses
  for insert
  to anon, authenticated
  with check (true);

-- Realtime: evenimente UPDATE/INSERT pe tabelele folosite de UI
-- Dacă primești „already member of publication”, e ok.
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.round_responses;

