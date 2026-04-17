-- Gate final results visibility until Admin publishes them.
-- Players should wait on `sessions.results_published_at` before seeing /game/results.

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS results_published_at timestamptz NULL;

