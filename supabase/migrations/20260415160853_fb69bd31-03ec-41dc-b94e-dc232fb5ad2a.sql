ALTER TABLE public.workout_plan_exercises
  ADD COLUMN IF NOT EXISTS weight_lbs numeric NULL,
  ADD COLUMN IF NOT EXISTS rpe integer NULL,
  ADD COLUMN IF NOT EXISTS distance text NULL,
  ADD COLUMN IF NOT EXISTS detail_fields text[] NULL DEFAULT '{}';