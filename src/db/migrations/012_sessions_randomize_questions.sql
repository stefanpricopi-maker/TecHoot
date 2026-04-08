-- Toggle pentru randomizarea ordinii întrebărilor per sesiune.

alter table public.sessions
  add column if not exists randomize_questions boolean not null default true;

