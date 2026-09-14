DROP POLICY IF EXISTS "Trainers can manage their Google Calendar connection" ON public.google_calendar_connections;

REVOKE ALL ON TABLE public.google_calendar_connections FROM anon;
REVOKE ALL ON TABLE public.google_calendar_connections FROM authenticated;
GRANT ALL ON TABLE public.google_calendar_connections TO service_role;

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;