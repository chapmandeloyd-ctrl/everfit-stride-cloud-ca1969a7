
CREATE POLICY "Clients can delete their workout sessions"
ON public.workout_sessions FOR DELETE
USING (auth.uid() = client_id);

CREATE POLICY "Trainers can delete workout sessions for clients"
ON public.workout_sessions FOR DELETE
USING (EXISTS (
  SELECT 1 FROM trainer_clients tc
  WHERE tc.client_id = workout_sessions.client_id
  AND tc.trainer_id = auth.uid()
));

CREATE POLICY "Clients can delete their workouts"
ON public.client_workouts FOR DELETE
USING (auth.uid() = client_id);

CREATE POLICY "Trainers can delete client workouts"
ON public.client_workouts FOR DELETE
USING (EXISTS (
  SELECT 1 FROM trainer_clients tc
  WHERE tc.client_id = client_workouts.client_id
  AND tc.trainer_id = auth.uid()
));
