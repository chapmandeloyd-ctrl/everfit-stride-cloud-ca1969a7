ALTER TABLE public.client_weekly_schedule
  DROP CONSTRAINT IF EXISTS client_weekly_schedule_ratio_check;

ALTER TABLE public.client_weekly_schedule
  ADD CONSTRAINT client_weekly_schedule_ratio_check
  CHECK (ratio IN ('16:8','18:6','20:4','omad','eat_all_day'));