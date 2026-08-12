CREATE TABLE public.juice_fast_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  trainer_id UUID,
  mode TEXT NOT NULL DEFAULT 'juice_only',
  planned_days INTEGER NOT NULL DEFAULT 3,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  ended_early BOOLEAN NOT NULL DEFAULT false,
  end_reason TEXT,
  includes_refeed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT juice_fast_sessions_mode_check CHECK (mode IN ('juice_only','juice_plus_light')),
  CONSTRAINT juice_fast_sessions_status_check CHECK (status IN ('active','completed','cancelled')),
  CONSTRAINT juice_fast_sessions_days_check CHECK (planned_days BETWEEN 1 AND 14)
);

CREATE INDEX idx_juice_fast_sessions_client ON public.juice_fast_sessions (client_id, status, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.juice_fast_sessions TO authenticated;
GRANT ALL ON public.juice_fast_sessions TO service_role;
ALTER TABLE public.juice_fast_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage their own juice fasts"
  ON public.juice_fast_sessions FOR ALL TO authenticated
  USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Trainers manage their clients juice fasts"
  ON public.juice_fast_sessions FOR ALL TO authenticated
  USING (public.is_trainer_of_client(auth.uid(), client_id))
  WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));

CREATE TABLE public.juice_fast_daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.juice_fast_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_number INTEGER,
  juice_count INTEGER NOT NULL DEFAULT 0,
  water_oz INTEGER NOT NULL DEFAULT 0,
  snacked BOOLEAN NOT NULL DEFAULT false,
  snack_note TEXT,
  photo_url TEXT,
  energy_rating INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT juice_fast_daily_logs_unique_day UNIQUE (session_id, log_date),
  CONSTRAINT juice_fast_daily_logs_energy_check CHECK (energy_rating IS NULL OR energy_rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_juice_fast_daily_logs_session ON public.juice_fast_daily_logs (session_id, log_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.juice_fast_daily_logs TO authenticated;
GRANT ALL ON public.juice_fast_daily_logs TO service_role;
ALTER TABLE public.juice_fast_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage their own juice fast logs"
  ON public.juice_fast_daily_logs FOR ALL TO authenticated
  USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Trainers manage their clients juice fast logs"
  ON public.juice_fast_daily_logs FOR ALL TO authenticated
  USING (public.is_trainer_of_client(auth.uid(), client_id))
  WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));

CREATE TRIGGER update_juice_fast_sessions_updated_at
  BEFORE UPDATE ON public.juice_fast_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_juice_fast_daily_logs_updated_at
  BEFORE UPDATE ON public.juice_fast_daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();