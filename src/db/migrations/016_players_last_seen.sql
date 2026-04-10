-- Prezență în lobby: heartbeat actualizează last_seen_at; UI filtrează rândurile „moarte”.
alter table public.players
  add column if not exists last_seen_at timestamptz;

update public.players
set last_seen_at = joined_at
where last_seen_at is null;

alter table public.players
  alter column last_seen_at set default now();

alter table public.players
  alter column last_seen_at set not null;

create index if not exists players_session_last_seen_idx
  on public.players (session_id, last_seen_at desc);
