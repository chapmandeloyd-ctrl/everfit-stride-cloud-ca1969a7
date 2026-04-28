-- Allow trainers to insert early-end records on behalf of their assigned clients
-- (mirrors fasting_log policy; needed for trainer "Preview as Client" impersonation flow)
CREATE POLICY "Trainers insert early-end records for their clients"
  ON public.early_session_ends FOR INSERT
  WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));