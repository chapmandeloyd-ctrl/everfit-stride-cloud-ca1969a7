ALTER TABLE public.client_feature_settings
  ALTER COLUMN admin_show_live_schedule SET DEFAULT false;

UPDATE public.client_feature_settings
SET admin_show_live_schedule = false
WHERE admin_show_live_schedule = true;