DROP POLICY IF EXISTS "Users can view their own in-app notifications" ON public.in_app_notifications;
DROP POLICY IF EXISTS "Users can mark their notifications as read" ON public.in_app_notifications;

CREATE POLICY "Users or trainer preview can view in-app notifications"
ON public.in_app_notifications
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_trainer(auth.uid())
);

CREATE POLICY "Users or trainer preview can mark notifications read"
ON public.in_app_notifications
FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.is_trainer(auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_trainer(auth.uid())
);