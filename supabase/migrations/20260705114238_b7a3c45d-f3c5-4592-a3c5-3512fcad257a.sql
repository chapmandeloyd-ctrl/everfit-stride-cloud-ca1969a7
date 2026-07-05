ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS protocol_run_mode text NOT NULL DEFAULT 'one_time';

ALTER TABLE public.client_feature_settings
  DROP CONSTRAINT IF EXISTS client_feature_settings_protocol_run_mode_check;

ALTER TABLE public.client_feature_settings
  ADD CONSTRAINT client_feature_settings_protocol_run_mode_check
  CHECK (protocol_run_mode IN ('one_time', 'recurring'));