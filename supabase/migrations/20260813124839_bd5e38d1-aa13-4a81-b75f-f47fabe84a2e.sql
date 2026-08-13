ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS fast_hydration_reminder_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fast_hydration_interval_hours integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS fast_hydration_window_start time NOT NULL DEFAULT '08:00:00',
  ADD COLUMN IF NOT EXISTS fast_hydration_window_end time NOT NULL DEFAULT '20:00:00',
  ADD COLUMN IF NOT EXISTS fast_hydration_min_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS fast_hydration_last_sent_at timestamptz;