ALTER TABLE public.workout_plans
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS outro_text text,
  ADD COLUMN IF NOT EXISTS coach_voice_id text;

ALTER TABLE public.workout_sections
  ADD COLUMN IF NOT EXISTS intro_text text,
  ADD COLUMN IF NOT EXISTS rest_after_seconds integer;

ALTER TABLE public.workout_plan_exercises
  ADD COLUMN IF NOT EXISTS equipment text,
  ADD COLUMN IF NOT EXISTS weight_unit text NOT NULL DEFAULT 'lb',
  ADD COLUMN IF NOT EXISTS dropset_config jsonb,
  ADD COLUMN IF NOT EXISTS form_cue_start text,
  ADD COLUMN IF NOT EXISTS form_cue_mid text,
  ADD COLUMN IF NOT EXISTS side_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS form_cue_switch text,
  ADD COLUMN IF NOT EXISTS cardio_intervals jsonb;

ALTER TABLE public.workout_plan_exercises
  DROP CONSTRAINT IF EXISTS workout_plan_exercises_weight_unit_check,
  ADD CONSTRAINT workout_plan_exercises_weight_unit_check CHECK (weight_unit IN ('lb', 'kg')),
  DROP CONSTRAINT IF EXISTS workout_plan_exercises_side_mode_check,
  ADD CONSTRAINT workout_plan_exercises_side_mode_check CHECK (side_mode IN ('none', 'alternating', 'sequential'));

ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS skipped_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS incomplete_reason text,
  ADD COLUMN IF NOT EXISTS incomplete_note text,
  ADD COLUMN IF NOT EXISTS exercises_completed integer,
  ADD COLUMN IF NOT EXISTS exercises_planned integer,
  ADD COLUMN IF NOT EXISTS planned_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS calories_estimate integer,
  ADD COLUMN IF NOT EXISTS rpe smallint;

ALTER TABLE public.workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_rpe_check,
  ADD CONSTRAINT workout_sessions_rpe_check CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plans TO authenticated;
GRANT ALL ON public.workout_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sections TO authenticated;
GRANT ALL ON public.workout_sections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plan_exercises TO authenticated;
GRANT ALL ON public.workout_plan_exercises TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;