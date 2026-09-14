-- coach_plan_overrides: trainer must manage the client
DROP POLICY IF EXISTS "Trainers can insert overrides" ON public.coach_plan_overrides;
CREATE POLICY "Trainers can insert overrides" ON public.coach_plan_overrides
  FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid() AND public.is_trainer_of_client(auth.uid(), client_id));

-- health_notifications: trainer must manage the client (keep service/edge-function inserts)
DROP POLICY IF EXISTS "System can insert health notifications" ON public.health_notifications;
CREATE POLICY "System can insert health notifications" ON public.health_notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL
    OR auth.uid() = trainer_id AND public.is_trainer_of_client(auth.uid(), client_id)
  );

-- in_app_notifications: trainer can only notify own clients (or self/system rows)
DROP POLICY IF EXISTS "Trainers can insert in-app notifications" ON public.in_app_notifications;
CREATE POLICY "Trainers can insert in-app notifications" ON public.in_app_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_trainer_of_client(auth.uid(), user_id)
  );

-- notification_events: self or assigned trainer only
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notification_events;
CREATE POLICY "Authenticated users can insert notifications" ON public.notification_events
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_trainer_of_client(auth.uid(), user_id)
  );

-- system_events: tie rows to the inserting user or a verified relationship
DROP POLICY IF EXISTS "Authenticated users can insert events" ON public.system_events;
CREATE POLICY "Authenticated users can insert events" ON public.system_events
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    OR coach_id = auth.uid()
    OR public.is_trainer_of_client(auth.uid(), client_id)
  );

-- client_badges: clients can no longer self-award arbitrary badges;
-- inserts allowed only for the assigned trainer or service role (auth.uid() IS NULL)
DROP POLICY IF EXISTS "System can insert badges for clients" ON public.client_badges;
CREATE POLICY "System can insert badges for clients" ON public.client_badges
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL
    OR public.is_trainer_of_client(auth.uid(), client_id)
  );