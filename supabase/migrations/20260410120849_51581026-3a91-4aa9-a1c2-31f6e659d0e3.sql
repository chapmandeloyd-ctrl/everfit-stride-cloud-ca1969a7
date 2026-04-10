-- Add resume checkpoint and status columns to workout_sessions
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS resume_section_index integer,
  ADD COLUMN IF NOT EXISTS resume_exercise_index integer,
  ADD COLUMN IF NOT EXISTS resume_round integer,
  ADD COLUMN IF NOT EXISTS resume_set integer,
  ADD COLUMN IF NOT EXISTS resume_set_logs jsonb,
  ADD COLUMN IF NOT EXISTS completion_percentage integer;

-- Backfill existing rows: completed_at NOT NULL and is_partial = false → 'completed', is_partial = true → 'partial'
UPDATE public.workout_sessions
SET status = CASE
  WHEN is_partial = true THEN 'partial'
  ELSE 'completed'
END
WHERE status = 'completed' AND is_partial = true;

-- Index for quick lookup of in-progress sessions per client+workout
CREATE INDEX IF NOT EXISTS idx_workout_sessions_in_progress
  ON public.workout_sessions (client_id, workout_plan_id)
  WHERE status = 'in_progress';