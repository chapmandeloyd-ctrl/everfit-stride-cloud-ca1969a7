CREATE TABLE public.juice_fast_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.juice_fast_sessions(id) ON DELETE SET NULL,
  trigger text NOT NULL DEFAULT 'scheduled',
  day_number integer,
  planned_days integer,
  title text,
  body text,
  subscription_count integer NOT NULL DEFAULT 0,
  push_delivered_count integer NOT NULL DEFAULT 0,
  push_failed_count integer NOT NULL DEFAULT 0,
  email_sent boolean NOT NULL DEFAULT false,
  email_to text,
  in_app_created boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'sent',
  error text,
  reference_id text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.juice_fast_reminder_log TO authenticated;
GRANT ALL ON public.juice_fast_reminder_log TO service_role;

ALTER TABLE public.juice_fast_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own juice reminder log"
  ON public.juice_fast_reminder_log FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers view client juice reminder log"
  ON public.juice_fast_reminder_log FOR SELECT TO authenticated
  USING (public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Clients delete own juice reminder log"
  ON public.juice_fast_reminder_log FOR DELETE TO authenticated
  USING (auth.uid() = client_id);

CREATE INDEX idx_juice_reminder_log_client_time
  ON public.juice_fast_reminder_log (client_id, attempted_at DESC);

CREATE TRIGGER trg_juice_fast_reminder_log_updated_at
  BEFORE UPDATE ON public.juice_fast_reminder_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();