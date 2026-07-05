ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS autostart_skipped_on date,
  ADD COLUMN IF NOT EXISTS pre_fast_email_pref text NOT NULL DEFAULT 'all'
    CHECK (pre_fast_email_pref IN ('all','final_only','off'));