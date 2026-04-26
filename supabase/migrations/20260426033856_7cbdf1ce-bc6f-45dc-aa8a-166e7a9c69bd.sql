-- 1. Add Zapier webhook URL to trainer profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS zapier_webhook_url text;

-- 2. Dedup log table for fired webhook events
CREATE TABLE IF NOT EXISTS public.fasting_webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  trainer_id uuid NOT NULL,
  event_type text NOT NULL,           -- fast_started, pre_end_1h, milestone_12 ... milestone_72, fast_completed, fast_broken
  reference_id text NOT NULL,         -- e.g. "<active_fast_start_at>:<event_type>"
  webhook_url text,
  status text NOT NULL DEFAULT 'sent',-- sent | failed | skipped
  response_status int,
  error text,
  fired_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS fasting_webhook_log_unique
  ON public.fasting_webhook_log (client_id, event_type, reference_id);

CREATE INDEX IF NOT EXISTS fasting_webhook_log_trainer_idx
  ON public.fasting_webhook_log (trainer_id, fired_at DESC);

ALTER TABLE public.fasting_webhook_log ENABLE ROW LEVEL SECURITY;

-- Trainers can read their own log
CREATE POLICY "Trainers can view their own webhook log"
  ON public.fasting_webhook_log
  FOR SELECT
  USING (auth.uid() = trainer_id);

-- No client/trainer writes — only service role inserts/updates (bypasses RLS)
-- (No INSERT/UPDATE/DELETE policies on purpose.)