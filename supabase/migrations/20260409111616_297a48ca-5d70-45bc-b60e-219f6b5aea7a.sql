DROP POLICY IF EXISTS "Trainers can insert workout sessions for clients" ON public.workout_sessions;

CREATE POLICY "Trainers can insert workout sessions for clients"
ON public.workout_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.client_id = workout_sessions.client_id
      AND tc.trainer_id = auth.uid()
  )
);