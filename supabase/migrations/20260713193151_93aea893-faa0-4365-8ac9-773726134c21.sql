-- Add extended-fast access toggles to client_feature_settings
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS extended_fast_24h_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extended_fast_48h_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extended_fast_72h_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extended_fast_96h_enabled boolean NOT NULL DEFAULT false;