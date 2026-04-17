CREATE POLICY "Clients can view assigned trainer exercises"
ON public.exercises
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.client_feature_settings cfs
    WHERE cfs.client_id = auth.uid()
      AND cfs.trainer_id = exercises.trainer_id
  )
);