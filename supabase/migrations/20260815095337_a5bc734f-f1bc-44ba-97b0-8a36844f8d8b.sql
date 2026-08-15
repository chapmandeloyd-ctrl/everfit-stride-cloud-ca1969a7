CREATE POLICY "Trainer manages client onboarding progress"
ON public.onboarding_progress FOR ALL TO authenticated
USING (public.is_trainer_of_client(auth.uid(), client_id))
WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainer manages client metabolic profile"
ON public.user_metabolic_profile FOR ALL TO authenticated
USING (public.is_trainer_of_client(auth.uid(), client_id))
WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainer manages client progress entries"
ON public.progress_entries FOR ALL TO authenticated
USING (
  public.is_trainer_of_client(auth.uid(), client_id)
  OR EXISTS (SELECT 1 FROM public.trainer_clients tc WHERE tc.client_id = progress_entries.client_id AND tc.trainer_id = auth.uid())
)
WITH CHECK (
  public.is_trainer_of_client(auth.uid(), client_id)
  OR EXISTS (SELECT 1 FROM public.trainer_clients tc WHERE tc.client_id = progress_entries.client_id AND tc.trainer_id = auth.uid())
);