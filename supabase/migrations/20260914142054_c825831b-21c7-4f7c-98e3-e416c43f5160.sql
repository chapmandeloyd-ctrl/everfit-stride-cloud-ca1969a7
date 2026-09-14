CREATE POLICY "Backend services manage Google Calendar connections"
ON public.google_calendar_connections
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);