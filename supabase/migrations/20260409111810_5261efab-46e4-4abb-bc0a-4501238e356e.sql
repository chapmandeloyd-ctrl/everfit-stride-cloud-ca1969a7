DROP POLICY IF EXISTS "Trainers can update client workouts" ON public.client_workouts;
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
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.client_id = client_workouts.client_id
      AND tc.trainer_id = auth.uid()
  )
);