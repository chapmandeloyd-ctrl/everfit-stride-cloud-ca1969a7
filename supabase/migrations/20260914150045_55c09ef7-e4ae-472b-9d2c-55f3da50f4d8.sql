
REVOKE EXECUTE ON FUNCTION public.auto_provision_progress_tiles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_set_goal_start_weight() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_activity_events(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_single_active_goal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_activity_event_edited() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.provision_default_progress_tiles(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_push_removals_on_resubscribe() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_goal_start_weight_from_weighin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.stamp_goal_end() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_mcp_connections(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_mcp_connection(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.force_safe_profile_defaults() FROM PUBLIC, anon, authenticated;

-- Helpers the app legitimately needs, limited to signed-in users only
REVOKE EXECUTE ON FUNCTION public.admin_list_tables() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_trainer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_trainer_of_client(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_trainer_of_collection(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_trainer_of_workout_collection(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.emit_activity_event(uuid, text, text, text, text, text, jsonb, text, timestamptz, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trainer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trainer_of_client(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trainer_of_collection(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trainer_of_workout_collection(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emit_activity_event(uuid, text, text, text, text, text, jsonb, text, timestamptz, uuid) TO authenticated;

-- Guardian invite pages are opened by signed-out guardians with a one-time token
REVOKE EXECUTE ON FUNCTION public.get_guardian_link_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guardian_link_by_token(text) TO anon, authenticated;
