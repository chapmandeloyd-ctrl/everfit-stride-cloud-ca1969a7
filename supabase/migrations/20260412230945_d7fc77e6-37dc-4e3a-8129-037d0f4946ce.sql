
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS if_roles text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meal_role text,
  ADD COLUMN IF NOT EXISTS subtype text,
  ADD COLUMN IF NOT EXISTS keto_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trigger_conditions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS carb_limit_note text,
  ADD COLUMN IF NOT EXISTS protein_target_note text,
  ADD COLUMN IF NOT EXISTS why_it_works text,
  ADD COLUMN IF NOT EXISTS best_for text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avoid_if text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meal_timing text,
  ADD COLUMN IF NOT EXISTS ingredients_list text;
