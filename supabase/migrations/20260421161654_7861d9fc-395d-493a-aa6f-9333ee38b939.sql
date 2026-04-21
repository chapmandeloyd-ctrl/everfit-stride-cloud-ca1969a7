-- Per-client health reminder configuration (DB-backed so trainers can set on behalf of clients)
CREATE TABLE public.client_health_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  times text[] NOT NULL DEFAULT ARRAY['08:00','13:00','20:00']::text[],
  timezone text NOT NULL DEFAULT 'UTC',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_health_reminders_client_id ON public.client_health_reminders(client_id);

ALTER TABLE public.client_health_reminders ENABLE ROW LEVEL SECURITY;

-- Clients can view their own reminders
CREATE POLICY "Clients view own reminders"
ON public.client_health_reminders
FOR SELECT
USING (auth.uid() = client_id);

-- Clients can insert their own reminders
CREATE POLICY "Clients insert own reminders"
ON public.client_health_reminders
FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Clients can update their own reminders
CREATE POLICY "Clients update own reminders"
ON public.client_health_reminders
FOR UPDATE
USING (auth.uid() = client_id);

-- Trainers can view their clients' reminders
CREATE POLICY "Trainers view client reminders"
ON public.client_health_reminders
FOR SELECT
USING (public.is_trainer_of_client(auth.uid(), client_id));

-- Trainers can insert reminders for their clients
CREATE POLICY "Trainers insert client reminders"
ON public.client_health_reminders
FOR INSERT
WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));

-- Trainers can update their clients' reminders
CREATE POLICY "Trainers update client reminders"
ON public.client_health_reminders
FOR UPDATE
USING (public.is_trainer_of_client(auth.uid(), client_id));

-- Auto-update updated_at on changes
CREATE TRIGGER trg_client_health_reminders_updated_at
BEFORE UPDATE ON public.client_health_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();