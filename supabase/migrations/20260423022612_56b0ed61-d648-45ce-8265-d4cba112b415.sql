-- Add scheduled_date to cardio_sessions so users can plan cardio for future days
ALTER TABLE public.cardio_sessions
  ADD COLUMN IF NOT EXISTS scheduled_date date;

CREATE INDEX IF NOT EXISTS idx_cardio_sessions_client_scheduled
  ON public.cardio_sessions (client_id, scheduled_date)
  WHERE scheduled_date IS NOT NULL;