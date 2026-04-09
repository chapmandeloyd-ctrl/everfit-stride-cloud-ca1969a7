DROP POLICY IF EXISTS "Trainers can insert exercise logs for clients" ON public.workout_exercise_logs;
CREATE POLICY "Trainers can insert exercise logs for clients"
ON public.workout_exercise_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_sessions ws
    JOIN trainer_clients tc ON tc.client_id = ws.client_id
    WHERE ws.id = workout_exercise_logs.session_id
      AND tc.trainer_id = auth.uid()
  )
);