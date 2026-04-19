
-- Remove any prior versions if they exist
DO $$ BEGIN
  PERFORM cron.unschedule('invoke-smart-nudges-every-5min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='invoke-smart-nudges-every-5min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.unschedule('invoke-habit-loop-scheduler-every-5min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='invoke-habit-loop-scheduler-every-5min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Schedule smart-nudges every 5 minutes
SELECT cron.schedule(
  'invoke-smart-nudges-every-5min',
  '*/5 * * * *',
  $$ select net.http_post(
       url:='https://eexxmfuknqttujecbcho.supabase.co/functions/v1/smart-nudges',
       headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleHhtZnVrbnF0dHVqZWNiY2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjEyNDksImV4cCI6MjA3ODc5NzI0OX0.ZnxJIaEB5H0libjWTHUlIoimAD-elqOJhQ02Ejnbryo"}'::jsonb,
       body:=concat('{"time":"', now(), '"}')::jsonb
     ); $$
);

-- Schedule habit-loop-scheduler every 5 minutes
SELECT cron.schedule(
  'invoke-habit-loop-scheduler-every-5min',
  '*/5 * * * *',
  $$ select net.http_post(
       url:='https://eexxmfuknqttujecbcho.supabase.co/functions/v1/habit-loop-scheduler',
       headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleHhtZnVrbnF0dHVqZWNiY2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjEyNDksImV4cCI6MjA3ODc5NzI0OX0.ZnxJIaEB5H0libjWTHUlIoimAD-elqOJhQ02Ejnbryo"}'::jsonb,
       body:=concat('{"time":"', now(), '"}')::jsonb
     ); $$
);
