
ALTER TABLE public.water_goal_settings
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'fl_oz',
  ADD COLUMN IF NOT EXISTS reminders_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.water_goal_settings
  DROP CONSTRAINT IF EXISTS water_goal_settings_unit_check;
ALTER TABLE public.water_goal_settings
  ADD CONSTRAINT water_goal_settings_unit_check CHECK (unit IN ('fl_oz', 'liter'));

ALTER TABLE public.habit_loop_preferences
  ADD COLUMN IF NOT EXISTS hydration_enabled boolean NOT NULL DEFAULT true;
