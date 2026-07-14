UPDATE public.client_feature_settings
SET
  active_fast_start_at = NULL,
  active_fast_target_hours = NULL,
  last_fast_ended_at = GREATEST(COALESCE(last_fast_ended_at, 'epoch'::timestamptz), '2026-07-13 23:59:39.962+00'::timestamptz),
  last_auto_fast_started_for = COALESCE(last_auto_fast_started_for, '2026-07-13 23:59:39.962+00'::timestamptz),
  updated_at = now()
WHERE client_id = '1eee93c2-55e6-47bd-a68a-a1ed4219911e'
  AND active_fast_start_at = '2026-07-13 23:59:39.962+00'::timestamptz;