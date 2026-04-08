-- Rulează în Supabase SQL Editor dacă gazda rămâne la „0 din N” după ce jucătorul a răspuns:
-- cauza tipică: RLS pe `round_responses` fără politică SELECT (count = 0) și/sau lipsă din Realtime.

-- 1) Politici RLS pentru anon (MVP — restrânge în producție)
alter table public.round_responses enable row level security;

drop policy if exists "round_responses_select_anon" on public.round_responses;
create policy "round_responses_select_anon"
  on public.round_responses
  for select
  to anon, authenticated
  using (true);

drop policy if exists "round_responses_insert_anon" on public.round_responses;
create policy "round_responses_insert_anon"
  on public.round_responses
  for insert
  to anon, authenticated
  with check (true);

-- 2) Realtime (evenimente INSERT pentru contor live)
-- Dacă primești „already member of publication”, tabelul e deja adăugat — e în regulă.
alter publication supabase_realtime add table public.round_responses;
