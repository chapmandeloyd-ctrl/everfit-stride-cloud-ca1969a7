select cron.schedule(
  'dispatch-juice-hydration-reminders-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url:='https://eexxmfuknqttujecbcho.supabase.co/functions/v1/dispatch-juice-hydration-reminders',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleHhtZnVrbnF0dHVqZWNiY2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjEyNDksImV4cCI6MjA3ODc5NzI0OX0.ZnxJIaEB5H0libjWTHUlIoimAD-elqOJhQ02Ejnbryo"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);