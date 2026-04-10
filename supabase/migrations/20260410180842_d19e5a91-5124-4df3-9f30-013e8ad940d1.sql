
CREATE TABLE public.fasting_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_hours NUMERIC NOT NULL,
  actual_hours NUMERIC NOT NULL,
  completion_pct NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  ended_early BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fasting_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own fasting logs"
  ON public.fasting_log FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view client fasting logs"
  ON public.fasting_log FOR SELECT
  USING (public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Clients can insert own fasting logs"
  ON public.fasting_log FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Trainers can insert fasting logs"
  ON public.fasting_log FOR INSERT
  WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));

CREATE INDEX idx_fasting_log_client_date ON public.fasting_log (client_id, ended_at DESC);
