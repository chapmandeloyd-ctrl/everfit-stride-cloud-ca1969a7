
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS meal_intensity text DEFAULT null,
  ADD COLUMN IF NOT EXISTS satiety_score numeric DEFAULT null,
  ADD COLUMN IF NOT EXISTS digestion_load text DEFAULT null,
  ADD COLUMN IF NOT EXISTS craving_replacement text DEFAULT null;
