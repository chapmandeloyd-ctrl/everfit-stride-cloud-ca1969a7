
-- Allow clients to schedule their own workouts (self-scheduling)
CREATE POLICY "Clients can insert their own workouts"
ON public.client_workouts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_id);

-- Allow trainers to insert workouts for their assigned clients (covers impersonation + assignment)
CREATE POLICY "Trainers can insert workouts for their clients"
ON public.client_workouts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.client_id = client_workouts.client_id
      AND tc.trainer_id = auth.uid()
  )
);
