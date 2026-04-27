
-- water_log_entries: allow trainer-of-client to write
DROP POLICY IF EXISTS "Clients insert own water entries" ON public.water_log_entries;
DROP POLICY IF EXISTS "Clients update own water entries" ON public.water_log_entries;
DROP POLICY IF EXISTS "Clients delete own water entries" ON public.water_log_entries;

CREATE POLICY "Insert water entries for self or assigned client"
ON public.water_log_entries FOR INSERT
WITH CHECK (
  auth.uid() = client_id
  OR public.is_trainer_of_client(auth.uid(), client_id)
);

CREATE POLICY "Update water entries for self or assigned client"
ON public.water_log_entries FOR UPDATE
USING (
  auth.uid() = client_id
  OR public.is_trainer_of_client(auth.uid(), client_id)
);

CREATE POLICY "Delete water entries for self or assigned client"
ON public.water_log_entries FOR DELETE
USING (
  auth.uid() = client_id
  OR public.is_trainer_of_client(auth.uid(), client_id)
);

-- water_goal_settings: allow trainer-of-client to write
DROP POLICY IF EXISTS "Clients insert own water goal" ON public.water_goal_settings;
DROP POLICY IF EXISTS "Clients update own water goal" ON public.water_goal_settings;

CREATE POLICY "Insert water goal for self or assigned client"
ON public.water_goal_settings FOR INSERT
WITH CHECK (
  auth.uid() = client_id
  OR public.is_trainer_of_client(auth.uid(), client_id)
);

CREATE POLICY "Update water goal for self or assigned client"
ON public.water_goal_settings FOR UPDATE
USING (
  auth.uid() = client_id
  OR public.is_trainer_of_client(auth.uid(), client_id)
);
