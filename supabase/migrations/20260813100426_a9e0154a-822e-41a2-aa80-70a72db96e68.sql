ALTER TABLE public.juice_fast_sessions
  ADD COLUMN IF NOT EXISTS log_reminder_snoozed_until timestamptz;