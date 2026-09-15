-- 1. client_badges: remove null-auth bypass
DROP POLICY IF EXISTS "System can insert badges for clients" ON public.client_badges;
CREATE POLICY "Clients and trainers can insert badges"
ON public.client_badges FOR INSERT TO authenticated
WITH CHECK (auth.uid() = client_id OR public.is_trainer_of_client(auth.uid(), client_id));

-- 2. coaching_messages: service role only inserts (plus trainers for their clients)
DROP POLICY IF EXISTS "Service role can insert coaching messages" ON public.coaching_messages;
CREATE POLICY "Service role can insert coaching messages"
ON public.coaching_messages FOR INSERT TO service_role
WITH CHECK (true);
CREATE POLICY "Trainers can insert coaching messages for their clients"
ON public.coaching_messages FOR INSERT TO authenticated
WITH CHECK (public.is_trainer(auth.uid()) AND public.is_trainer_of_client(auth.uid(), client_id));

-- 3. habit_loop_notifications: service role only inserts
DROP POLICY IF EXISTS "System can insert habit loop notifications" ON public.habit_loop_notifications;
CREATE POLICY "Service role can insert habit loop notifications"
ON public.habit_loop_notifications FOR INSERT TO service_role
WITH CHECK (true);

-- 4. health_notifications: remove null-auth bypass
DROP POLICY IF EXISTS "System can insert health notifications" ON public.health_notifications;
CREATE POLICY "Trainers can insert health notifications"
ON public.health_notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = trainer_id AND public.is_trainer_of_client(auth.uid(), client_id));
CREATE POLICY "Service role can insert health notifications"
ON public.health_notifications FOR INSERT TO service_role
WITH CHECK (true);

-- 5. cardio_sessions: trainer SELECT uses the real trainer-client relationship
DROP POLICY IF EXISTS "Trainers can view client cardio sessions" ON public.cardio_sessions;
CREATE POLICY "Trainers can view client cardio sessions"
ON public.cardio_sessions FOR SELECT TO authenticated
USING (
  public.is_trainer_of_client(auth.uid(), client_id)
  OR EXISTS (
    SELECT 1 FROM public.client_feature_settings cfs
    WHERE cfs.client_id = cardio_sessions.client_id AND cfs.trainer_id = auth.uid()
  )
);

-- 6. Revoke EXECUTE on SECURITY DEFINER functions that app clients must not call
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'admin_list_tables','delete_email','email_queue_dispatch','email_queue_wake',
        'enqueue_email','move_to_dlq','read_email_batch','provision_default_progress_tiles',
        'revoke_mcp_connection','list_mcp_connections',
        'auto_provision_progress_tiles','auto_set_goal_start_weight','ensure_single_active_goal',
        'force_safe_profile_defaults','handle_new_user','mark_activity_event_edited',
        'prevent_untrusted_profile_role_change','protect_coach_controlled_client_settings',
        'resolve_push_removals_on_resubscribe','set_goal_start_weight_from_weighin',
        'stamp_goal_end','touch_updated_at','update_updated_at','update_updated_at_column'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', r.sig);
  END LOOP;

  -- Client-facing helpers: keep signed-in access, drop anonymous access
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('emit_activity_event','backfill_activity_events')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;