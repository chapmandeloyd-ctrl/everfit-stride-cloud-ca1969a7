ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS assigned_protocol_duration_days integer;

COMMENT ON COLUMN public.client_feature_settings.assigned_protocol_duration_days IS
  'Trainer-set per-client duration (days) for the assigned fasting protocol. Overrides fasting_protocols.duration_days for this client. NULL = use protocol default / ongoing.';