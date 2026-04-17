ALTER TABLE public.client_macro_targets
  ADD COLUMN IF NOT EXISTS tdee integer,
  ADD COLUMN IF NOT EXISTS deficit_pct numeric;