-- "Cel mai rapid deget": store per-answer response time (ms) for later aggregation.

alter table public.round_responses
  add column if not exists response_time_ms int;

-- Keep nullable for backwards compatibility / partial data.

