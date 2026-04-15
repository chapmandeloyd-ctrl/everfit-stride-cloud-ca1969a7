ALTER TABLE public.workout_sessions
  DROP CONSTRAINT workout_sessions_workout_plan_id_fkey,
  ADD CONSTRAINT workout_sessions_workout_plan_id_fkey
    FOREIGN KEY (workout_plan_id) REFERENCES public.workout_plans(id) ON DELETE SET NULL;