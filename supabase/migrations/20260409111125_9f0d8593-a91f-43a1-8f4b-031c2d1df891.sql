
-- Allow trainers to insert workout sessions for their clients
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

-- Allow trainers to update workout sessions for their clients
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
);

-- Allow trainers to insert exercise logs for their clients
CREATE POLICY "Trainers can insert exercise logs for clients"
ON public.workout_exercise_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workout_sessions ws
    JOIN trainer_clients tc ON tc.client_id = ws.client_id
    WHERE ws.id = workout_exercise_logs.session_id
    AND tc.trainer_id = auth.uid()
  )
);

-- Allow trainers to update client_workouts completed_at
CREATE POLICY "Trainers can update client workouts"
ON public.client_workouts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.client_id = client_workouts.client_id
    AND tc.trainer_id = auth.uid()
  )
);
