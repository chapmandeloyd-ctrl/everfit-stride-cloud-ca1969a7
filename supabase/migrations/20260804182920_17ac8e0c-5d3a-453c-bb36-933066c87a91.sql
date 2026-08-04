-- Allow clients to create and edit their OWN plan settings row so the
-- client-side plan builder can save the same fields the trainer panel saves.
CREATE POLICY "Clients can create their own feature settings"
ON public.client_feature_settings
FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can update their own feature settings"
ON public.client_feature_settings
FOR UPDATE
TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.client_feature_settings TO authenticated;