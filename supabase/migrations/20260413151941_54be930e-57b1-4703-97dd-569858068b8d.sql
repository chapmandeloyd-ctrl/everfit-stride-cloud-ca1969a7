-- Add macro_profile to recipes
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS macro_profile text NOT NULL DEFAULT 'balanced';

-- Add serving_multiplier to client_meal_selections
ALTER TABLE public.client_meal_selections
  ADD COLUMN IF NOT EXISTS serving_multiplier numeric NOT NULL DEFAULT 1.0;

-- Auto-classify existing recipes based on macros
UPDATE public.recipes
SET macro_profile = CASE
  WHEN protein IS NOT NULL AND calories IS NOT NULL AND calories > 0
    AND (protein * 4.0 / calories) >= 0.35 THEN 'high_protein'
  WHEN fats IS NOT NULL AND calories IS NOT NULL AND calories > 0
    AND (fats * 9.0 / calories) >= 0.65 THEN 'high_fat'
  WHEN carbs IS NOT NULL AND carbs >= 20 THEN 'performance_carb'
  ELSE 'balanced'
END
WHERE macro_profile = 'balanced';