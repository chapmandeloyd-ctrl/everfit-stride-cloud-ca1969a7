ALTER TABLE public.client_feature_settings
ADD COLUMN IF NOT EXISTS lock_client_plan_choice boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.client_feature_settings.lock_client_plan_choice IS
  'When true, the client cannot pick their own fasting protocol or keto type — only the trainer assigns them.';