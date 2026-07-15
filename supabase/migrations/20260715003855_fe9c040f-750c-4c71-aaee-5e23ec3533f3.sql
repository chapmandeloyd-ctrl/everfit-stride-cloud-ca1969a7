ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'apex',
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_type text,
  ADD COLUMN IF NOT EXISTS external_name text,
  ADD COLUMN IF NOT EXISTS external_metadata jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS workout_sessions_source_external_uidx
  ON public.workout_sessions (source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS workout_sessions_client_started_idx
  ON public.workout_sessions (client_id, started_at DESC);