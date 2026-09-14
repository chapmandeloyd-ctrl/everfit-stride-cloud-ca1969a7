DROP POLICY IF EXISTS "Trainers can view client checkins" ON public.daily_checkins;
CREATE POLICY "Trainers can view assigned client checkins"
ON public.daily_checkins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trainer_clients tc
    WHERE tc.trainer_id = auth.uid()
      AND tc.client_id = daily_checkins.client_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.client_feature_settings cfs
    WHERE cfs.trainer_id = auth.uid()
      AND cfs.client_id = daily_checkins.client_id
  )
);

DROP POLICY IF EXISTS "Trainers can view client scores" ON public.engine_scores;
CREATE POLICY "Trainers can view assigned client scores"
ON public.engine_scores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trainer_clients tc
    WHERE tc.trainer_id = auth.uid()
      AND tc.client_id = engine_scores.client_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.client_feature_settings cfs
    WHERE cfs.trainer_id = auth.uid()
      AND cfs.client_id = engine_scores.client_id
  )
);