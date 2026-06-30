
ALTER TABLE public.protocol_daily_schedules
  ALTER COLUMN protocol_id TYPE TEXT USING protocol_id::text;
