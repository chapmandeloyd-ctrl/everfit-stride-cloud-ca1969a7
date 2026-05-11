ALTER TABLE public.client_keto_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients view own keto assignments" ON public.client_keto_assignments;
DROP POLICY IF EXISTS "Trainers manage client keto assignments" ON public.client_keto_assignments;

CREATE POLICY "Clients can view own keto assignments"
ON public.client_keto_assignments
FOR SELECT
TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Clients can create own keto assignments"
ON public.client_keto_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = auth.uid()
  AND assigned_by = auth.uid()
);

CREATE POLICY "Clients can update own keto assignments"
ON public.client_keto_assignments
FOR UPDATE
TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Assigned trainers can view client keto assignments"
ON public.client_keto_assignments
FOR SELECT
TO authenticated
USING (public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Assigned trainers can create client keto assignments"
ON public.client_keto_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_trainer_of_client(auth.uid(), client_id)
  AND assigned_by = auth.uid()
);

CREATE POLICY "Assigned trainers can update client keto assignments"
ON public.client_keto_assignments
FOR UPDATE
TO authenticated
USING (public.is_trainer_of_client(auth.uid(), client_id))
WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Assigned trainers can delete client keto assignments"
ON public.client_keto_assignments
FOR DELETE
TO authenticated
USING (public.is_trainer_of_client(auth.uid(), client_id));

CREATE UNIQUE INDEX IF NOT EXISTS client_keto_assignments_one_active_per_client_idx
ON public.client_keto_assignments (client_id)
WHERE is_active = true;