ALTER TABLE public.juice_fast_sessions
  ADD COLUMN IF NOT EXISTS hydration_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hydration_interval_hours integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS hydration_window_start time NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS hydration_window_end time NOT NULL DEFAULT '20:00',
  ADD COLUMN IF NOT EXISTS hydration_last_sent_at timestamptz;