-- Default fasting_enabled to true for new clients
ALTER TABLE public.client_feature_settings
  ALTER COLUMN fasting_enabled SET DEFAULT true;

-- Backfill: enable fasting for all existing clients
UPDATE public.client_feature_settings
SET fasting_enabled = true
WHERE fasting_enabled = false;