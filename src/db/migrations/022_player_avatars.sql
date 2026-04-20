-- Player avatars (small icon beside name)

alter table public.players
  add column if not exists avatar_key text not null default 'bible';

-- Keep it permissive (text) to avoid breaking older clients;
-- the app validates allowed keys client-side.

