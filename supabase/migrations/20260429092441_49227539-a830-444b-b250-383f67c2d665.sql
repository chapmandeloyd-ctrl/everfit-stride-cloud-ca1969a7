ALTER TABLE public.client_feature_settings
ADD COLUMN preferred_eating_window_opens_at time without time zone,
ADD COLUMN preferred_eating_window_closes_at time without time zone;