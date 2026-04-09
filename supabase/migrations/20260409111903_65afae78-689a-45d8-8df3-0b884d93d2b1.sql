DROP POLICY IF EXISTS "Trainers can view client workout sessions" ON public.workout_sessions;

CREATE POLICY "Trainers can view client workout sessions"
ON public.workout_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM trainer_clients tc
    WHERE tc.client_id = workout_sessions.client_id
      AND tc.trainer_id = auth.uid()
  )
);