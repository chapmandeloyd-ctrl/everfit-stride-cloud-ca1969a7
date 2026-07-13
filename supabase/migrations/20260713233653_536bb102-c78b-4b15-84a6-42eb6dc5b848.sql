UPDATE public.client_feature_settings
SET active_fast_start_at = null,
    active_fast_target_hours = null,
    eating_window_ends_at = null,
    last_fast_ended_at = null,
    last_fast_completed_at = null,
    updated_at = now()
WHERE client_id = '1eee93c2-55e6-47bd-a68a-a1ed4219911e'::uuid;