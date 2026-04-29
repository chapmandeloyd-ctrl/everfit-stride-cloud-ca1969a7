
ALTER TABLE public.health_data DROP CONSTRAINT IF EXISTS health_data_source_check;

ALTER TABLE public.health_data
  ADD CONSTRAINT health_data_source_check
  CHECK (source = ANY (ARRAY[
    'apple_health'::text,
    'samsung_health'::text,
    'google_fit'::text,
    'health_connect'::text,
    'ai_snapshot'::text
  ]));
