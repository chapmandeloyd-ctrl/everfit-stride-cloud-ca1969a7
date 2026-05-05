-- Allow trainers to manage (delete/insert/update) quick fasting plans
CREATE POLICY "Trainers can delete quick fasting plans"
ON public.quick_fasting_plans
FOR DELETE
TO authenticated
USING (public.is_trainer(auth.uid()));

CREATE POLICY "Trainers can insert quick fasting plans"
ON public.quick_fasting_plans
FOR INSERT
TO authenticated
WITH CHECK (public.is_trainer(auth.uid()));

CREATE POLICY "Trainers can update quick fasting plans"
ON public.quick_fasting_plans
FOR UPDATE
TO authenticated
USING (public.is_trainer(auth.uid()))
WITH CHECK (public.is_trainer(auth.uid()));

-- Clear references to quick plans before deletion
UPDATE public.client_feature_settings SET selected_quick_plan_id = NULL WHERE selected_quick_plan_id IS NOT NULL;

-- Wipe all existing quick fasting plans
DELETE FROM public.quick_fasting_plans;