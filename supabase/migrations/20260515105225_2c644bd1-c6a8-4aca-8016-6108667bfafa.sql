ALTER TABLE public.client_feature_settings
ADD COLUMN IF NOT EXISTS custom_manual_plans_enabled boolean NOT NULL DEFAULT false;