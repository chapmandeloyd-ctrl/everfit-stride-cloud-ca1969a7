ALTER TABLE public.client_feature_settings 
ADD COLUMN IF NOT EXISTS plan_reviewed_at timestamptz,
ADD COLUMN IF NOT EXISTS plan_saved_for_later boolean NOT NULL DEFAULT false;