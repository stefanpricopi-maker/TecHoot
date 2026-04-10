-- Add an automatic leaderboard break state (every N questions).
-- Safe to run multiple times.

do $$
begin
  alter type public.session_status add value if not exists 'leaderboard_break';
exception
  when duplicate_object then null;
end $$;

alter table public.sessions
  add column if not exists leaderboard_break_until timestamptz;

