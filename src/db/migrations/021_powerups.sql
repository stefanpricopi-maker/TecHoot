-- Power-Ups: streak rewards + tactical advantages

alter table public.players
  add column if not exists correct_streak int not null default 0;

-- Inventory counts, e.g. {"fifty_fifty":1,"shield":0,"double_points":2}
alter table public.players
  add column if not exists powerups jsonb not null default '{}'::jsonb;

-- Pending reward when streak reached 3 and player must pick one power-up.
alter table public.players
  add column if not exists pending_powerup_reward boolean not null default false;

-- Active one-shot effects (applies to next submission in current/next question depending on type).
alter table public.players
  add column if not exists active_powerup text;

alter table public.players
  add column if not exists active_powerup_uses int;

alter table public.players
  add column if not exists active_powerup_question_index int;

alter table public.players
  drop constraint if exists players_active_powerup_check;

alter table public.players
  add constraint players_active_powerup_check
  check (
    active_powerup is null
    or active_powerup in ('fifty_fifty', 'shield', 'double_points')
  );

