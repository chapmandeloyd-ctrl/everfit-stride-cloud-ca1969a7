
-- Add macro mode and default gram targets to keto_types
ALTER TABLE public.keto_types
  ADD COLUMN IF NOT EXISTS macro_mode text NOT NULL DEFAULT 'percentage_based',
  ADD COLUMN IF NOT EXISTS protein_grams integer NULL,
  ADD COLUMN IF NOT EXISTS fat_grams integer NULL,
  ADD COLUMN IF NOT EXISTS carb_grams integer NULL;

-- Set sensible gram defaults for existing keto types based on a ~2000 cal reference
UPDATE public.keto_types SET protein_grams = 110, fat_grams = 162, carb_grams = 20 WHERE abbreviation = 'SKD';
UPDATE public.keto_types SET protein_grams = 160, fat_grams = 130, carb_grams = 20 WHERE abbreviation = 'HPKD';
UPDATE public.keto_types SET protein_grams = 140, fat_grams = 140, carb_grams = 35 WHERE abbreviation = 'TKD';
UPDATE public.keto_types SET protein_grams = 100, fat_grams = 162, carb_grams = 20 WHERE abbreviation = 'MCT';
UPDATE public.keto_types SET protein_grams = 100, fat_grams = 160, carb_grams = 30 WHERE abbreviation = 'CKD';
UPDATE public.keto_types SET protein_grams = 160, fat_grams = 130, carb_grams = 20 WHERE abbreviation IN ('PSMF', 'AKD');
