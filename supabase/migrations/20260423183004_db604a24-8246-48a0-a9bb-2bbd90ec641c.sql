-- Add Cloudflare Stream tracking to exercises and other workout-related video tables
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS cloudflare_video_id text,
  ADD COLUMN IF NOT EXISTS cloudflare_migration_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS cloudflare_migration_error text,
  ADD COLUMN IF NOT EXISTS cloudflare_migrated_at timestamptz;

ALTER TABLE public.ondemand_workouts
  ADD COLUMN IF NOT EXISTS cloudflare_video_id text;

ALTER TABLE public.workout_plans
  ADD COLUMN IF NOT EXISTS cloudflare_video_id text;

-- Indexes for migration queue lookups
CREATE INDEX IF NOT EXISTS idx_exercises_cf_status
  ON public.exercises (cloudflare_migration_status)
  WHERE cloudflare_video_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_cf_video_id
  ON public.exercises (cloudflare_video_id)
  WHERE cloudflare_video_id IS NOT NULL;

-- Backfill: any existing rows already considered "pending" (handled by default)
-- Mark rows with no video_url as not_applicable so they're skipped
UPDATE public.exercises
  SET cloudflare_migration_status = 'not_applicable'
  WHERE video_url IS NULL AND cloudflare_migration_status = 'pending';