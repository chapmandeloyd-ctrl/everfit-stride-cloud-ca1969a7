ALTER TABLE public.juice_fast_sessions
  ADD COLUMN IF NOT EXISTS log_reminder_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS log_reminder_time text NOT NULL DEFAULT '19:00';