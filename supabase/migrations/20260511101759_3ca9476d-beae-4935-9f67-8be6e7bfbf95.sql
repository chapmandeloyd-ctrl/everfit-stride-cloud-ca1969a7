ALTER TABLE public.client_feature_settings
ADD COLUMN IF NOT EXISTS quick_plan_duration_days integer;

ALTER TABLE public.client_feature_settings
DROP CONSTRAINT IF EXISTS quick_plan_duration_days_range;

ALTER TABLE public.client_feature_settings
ADD CONSTRAINT quick_plan_duration_days_range
CHECK (quick_plan_duration_days IS NULL OR (quick_plan_duration_days BETWEEN 1 AND 30));