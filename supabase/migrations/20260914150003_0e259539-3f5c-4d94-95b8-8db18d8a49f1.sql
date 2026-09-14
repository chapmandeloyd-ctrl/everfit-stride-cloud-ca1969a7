
-- 1. Fix mutable search_path on remaining functions
CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  RETURN new_id;
END;
$function$;

-- 2. Revoke direct EXECUTE on SECURITY DEFINER functions that app users must not call
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_activity_events(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.provision_default_progress_tiles(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_mcp_connections(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_mcp_connection(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_mcp_connections(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_mcp_connection(uuid, uuid) TO service_role;

-- trigger functions should never be callable directly
REVOKE EXECUTE ON FUNCTION public.auto_provision_progress_tiles() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_set_goal_start_weight() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_single_active_goal() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_activity_event_edited() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_push_removals_on_resubscribe() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_goal_start_weight_from_weighin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.stamp_goal_end() FROM anon, authenticated;

-- anon has no business calling these authorization/data helpers
REVOKE EXECUTE ON FUNCTION public.admin_list_tables() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_trainer(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_trainer_of_client(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_trainer_of_collection(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_trainer_of_workout_collection(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.emit_activity_event(uuid, text, text, text, text, text, jsonb, text, timestamptz, uuid) FROM anon;

-- 3. Trainer-of-client must be backed by an active trainer_clients assignment
CREATE OR REPLACE FUNCTION public.is_trainer_of_client(_trainer_id uuid, _client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.trainer_clients tc
    JOIN public.profiles p ON p.id = tc.trainer_id
    WHERE tc.trainer_id = _trainer_id
      AND tc.client_id = _client_id
      AND tc.status = 'active'
      AND p.role = 'trainer'
  )
  OR EXISTS (
    SELECT 1
    FROM public.client_feature_settings cfs
    JOIN public.profiles p ON p.id = cfs.trainer_id
    JOIN public.trainer_clients tc
      ON tc.trainer_id = cfs.trainer_id AND tc.client_id = cfs.client_id AND tc.status = 'active'
    WHERE cfs.client_id = _client_id
      AND cfs.trainer_id = _trainer_id
      AND p.role = 'trainer'
  )
$function$;

-- 4. Only real trainers can create/modify trainer-client relationships
DROP POLICY IF EXISTS "Trainers can insert their clients" ON public.trainer_clients;
CREATE POLICY "Trainers can insert their clients"
  ON public.trainer_clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = trainer_id AND public.is_trainer(auth.uid()));

DROP POLICY IF EXISTS "Trainers can update their clients" ON public.trainer_clients;
CREATE POLICY "Trainers can update their clients"
  ON public.trainer_clients FOR UPDATE TO authenticated
  USING (auth.uid() = trainer_id AND public.is_trainer(auth.uid()))
  WITH CHECK (auth.uid() = trainer_id AND public.is_trainer(auth.uid()));

DROP POLICY IF EXISTS "Trainers can delete their clients" ON public.trainer_clients;
CREATE POLICY "Trainers can delete their clients"
  ON public.trainer_clients FOR DELETE TO authenticated
  USING (auth.uid() = trainer_id AND public.is_trainer(auth.uid()));

-- 5. Profiles: trainer reads require a real trainer role + active relationship
DROP POLICY IF EXISTS "Trainers can view their clients profiles" ON public.profiles;
CREATE POLICY "Trainers can view their clients profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_trainer_of_client(auth.uid(), id));

-- 6. Prevent self-service role / tier escalation on profile insert
CREATE OR REPLACE FUNCTION public.force_safe_profile_defaults()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
DECLARE
  jwt_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF jwt_role <> 'service_role' AND auth.uid() IS NOT NULL THEN
    NEW.role := 'client'::user_role;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.force_safe_profile_defaults() FROM anon, authenticated;

DROP TRIGGER IF EXISTS force_safe_profile_defaults ON public.profiles;
CREATE TRIGGER force_safe_profile_defaults
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.force_safe_profile_defaults();

-- 7. Google Calendar: tokens stay backend-only, trainers see only their own non-secret row data
REVOKE ALL ON public.google_calendar_connections FROM anon, authenticated;
GRANT SELECT (id, trainer_id, calendar_id, sync_to_google, sync_from_google, connected_at, updated_at)
  ON public.google_calendar_connections TO authenticated;
GRANT ALL ON public.google_calendar_connections TO service_role;

DROP POLICY IF EXISTS "Trainers can view own calendar connection" ON public.google_calendar_connections;
CREATE POLICY "Trainers can view own calendar connection"
  ON public.google_calendar_connections FOR SELECT TO authenticated
  USING (auth.uid() = trainer_id AND public.is_trainer(auth.uid()));

-- 8. Storage: progress photos require real trainer role
DROP POLICY IF EXISTS "Trainers can view client progress photos" ON storage.objects;
CREATE POLICY "Trainers can view client progress photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND public.is_trainer_of_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- 9. Storage: ownership checks on trainer content buckets
DROP POLICY IF EXISTS "Trainers can upload resource files" ON storage.objects;
CREATE POLICY "Trainers can upload resource files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resource-files' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Trainers can delete own resource files" ON storage.objects;
CREATE POLICY "Trainers can delete own resource files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resource-files' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Trainers can update own resource files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resource-files' AND (storage.foldername(name))[1] = (auth.uid())::text)
  WITH CHECK (bucket_id = 'resource-files' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Trainers can upload equipment icons" ON storage.objects;
CREATE POLICY "Trainers can upload equipment icons"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'equipment-icons' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Trainers can delete own equipment icons" ON storage.objects;
CREATE POLICY "Trainers can delete own equipment icons"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'equipment-icons' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Trainers can update own equipment icons"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'equipment-icons' AND (storage.foldername(name))[1] = (auth.uid())::text)
  WITH CHECK (bucket_id = 'equipment-icons' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Trainers can upload workout videos" ON storage.objects;
CREATE POLICY "Trainers can upload workout videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'workout-videos' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Trainers can update own workout videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'workout-videos' AND (storage.foldername(name))[1] = (auth.uid())::text)
  WITH CHECK (bucket_id = 'workout-videos' AND (storage.foldername(name))[1] = (auth.uid())::text);
