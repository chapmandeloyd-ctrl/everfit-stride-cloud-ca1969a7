DROP POLICY IF EXISTS "Trainers can update workout sessions for clients" ON public.workout_sessions;

CREATE POLICY "Trainers can update workout sessions for clients"
ON public.workout_sessions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.client_id = workout_sessions.client_id
      AND tc.trainer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.client_id = workout_sessions.client_id
      AND tc.trainer_id = auth.uid()
  )
);