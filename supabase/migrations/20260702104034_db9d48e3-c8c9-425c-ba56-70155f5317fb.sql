ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS schedule_timezone text,
  ADD COLUMN IF NOT EXISTS day_start_hour smallint NOT NULL DEFAULT 0;

ALTER TABLE public.client_feature_settings
  DROP CONSTRAINT IF EXISTS client_feature_settings_day_start_hour_range;
ALTER TABLE public.client_feature_settings
  ADD CONSTRAINT client_feature_settings_day_start_hour_range
  CHECK (day_start_hour >= 0 AND day_start_hour <= 23);