DROP POLICY IF EXISTS "Clients can update safe personal settings" ON public.client_feature_settings;
CREATE POLICY "Clients can update safe personal settings"
ON public.client_feature_settings
FOR UPDATE
TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());