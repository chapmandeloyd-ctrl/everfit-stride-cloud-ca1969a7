-- Fix backfilled default weekly schedule rows that were seeded with swapped
-- semantics (12:00 fast start / 20:00 break). App treats window_start_time as
-- FAST START, so those defaults render an eating window of 4AM-12PM and cause
-- the auto-fast dispatcher to fire at noon. Flip only rows that still match
-- the original backfill defaults; leave anything a user/trainer has since
-- customized untouched.
UPDATE public.client_weekly_schedule
SET window_start_time = '20:00'::time,
    window_end_time = '12:00'::time,
    updated_at = now()
WHERE window_start_time = '12:00'::time
  AND window_end_time = '20:00'::time
  AND ratio = '16:8';

-- Also correct the column defaults for any future inserts.
ALTER TABLE public.client_weekly_schedule
  ALTER COLUMN window_start_time SET DEFAULT '20:00'::time,
  ALTER COLUMN window_end_time SET DEFAULT '12:00'::time;