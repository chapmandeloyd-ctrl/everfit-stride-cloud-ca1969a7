ALTER TABLE public.nutrition_logs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'apex',
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS nutrition_logs_source_external_id_key
  ON public.nutrition_logs (source, external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE public.metric_entries
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'apex',
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS metric_entries_source_external_id_key
  ON public.metric_entries (source, external_id)
  WHERE external_id IS NOT NULL;