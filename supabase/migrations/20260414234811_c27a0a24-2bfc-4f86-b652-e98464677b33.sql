-- Add validation columns to recipes table
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS is_valid boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS validation_flags text[] NOT NULL DEFAULT '{}';

-- Index for quickly filtering invalid meals
CREATE INDEX IF NOT EXISTS idx_recipes_is_valid ON public.recipes (is_valid) WHERE is_valid = false;