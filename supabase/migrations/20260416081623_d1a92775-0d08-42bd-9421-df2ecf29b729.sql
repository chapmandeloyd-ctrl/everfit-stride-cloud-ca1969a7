
ALTER TABLE public.client_consistency_streaks
  ADD COLUMN IF NOT EXISTS perfect_days_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_tier text NOT NULL DEFAULT 'Starter',
  ADD COLUMN IF NOT EXISTS weekly_completion numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fasting_completed_today boolean NOT NULL DEFAULT false;
