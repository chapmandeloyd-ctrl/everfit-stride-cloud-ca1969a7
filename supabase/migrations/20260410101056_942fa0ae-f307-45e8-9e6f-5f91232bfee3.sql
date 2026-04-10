CREATE OR REPLACE FUNCTION public.is_trainer_of_client(_trainer_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_feature_settings
    WHERE client_id = _client_id
      AND trainer_id = _trainer_id
  )
$$;

DROP POLICY IF EXISTS "Users or trainer preview can view in-app notifications" ON public.in_app_notifications;
DROP POLICY IF EXISTS "Users or trainer preview can mark notifications read" ON public.in_app_notifications;

CREATE POLICY "Users or assigned trainer can view in-app notifications"
ON public.in_app_notifications
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_trainer_of_client(auth.uid(), user_id)
);

CREATE POLICY "Users or assigned trainer can mark notifications read"
ON public.in_app_notifications
FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.is_trainer_of_client(auth.uid(), user_id)
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_trainer_of_client(auth.uid(), user_id)
);