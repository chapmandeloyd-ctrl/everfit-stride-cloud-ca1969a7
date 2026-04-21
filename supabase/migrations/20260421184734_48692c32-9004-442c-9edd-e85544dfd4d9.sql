UPDATE public.client_feature_settings
SET fasting_card_subtitle = 'Fasting is the foundation of your plan.'
WHERE fasting_card_subtitle ILIKE '%KSOM%';

ALTER TABLE public.client_feature_settings
  ALTER COLUMN fasting_card_subtitle SET DEFAULT 'Fasting is the foundation of your plan.';