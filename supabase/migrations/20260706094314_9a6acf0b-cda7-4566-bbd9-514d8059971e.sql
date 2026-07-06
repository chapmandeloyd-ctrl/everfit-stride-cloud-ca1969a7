
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS next_scheduled_fast_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_fast_skip_date DATE,
  ADD COLUMN IF NOT EXISTS last_auto_fast_headsup_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_auto_fast_started_for TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cfs_next_scheduled_fast_at
  ON public.client_feature_settings (next_scheduled_fast_at)
  WHERE next_scheduled_fast_at IS NOT NULL;
