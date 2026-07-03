CREATE TABLE public.plan_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_name text,
  keto_name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_days integer NOT NULL,
  completed_count integer NOT NULL DEFAULT 0,
  partial_count integer NOT NULL DEFAULT 0,
  missed_count integer NOT NULL DEFAULT 0,
  total_hours numeric NOT NULL DEFAULT 0,
  target_hours numeric NOT NULL DEFAULT 0,
  success_rate integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, start_date, duration_days)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_completions TO authenticated;
GRANT ALL ON public.plan_completions TO service_role;

ALTER TABLE public.plan_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own completions" ON public.plan_completions
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Clients insert own completions" ON public.plan_completions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Clients update own completions" ON public.plan_completions
  FOR UPDATE TO authenticated
  USING (auth.uid() = client_id OR public.is_trainer_of_client(auth.uid(), client_id))
  WITH CHECK (auth.uid() = client_id OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainers delete completions" ON public.plan_completions
  FOR DELETE TO authenticated
  USING (public.is_trainer_of_client(auth.uid(), client_id));

CREATE TRIGGER trg_plan_completions_updated_at
  BEFORE UPDATE ON public.plan_completions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_plan_completions_client ON public.plan_completions(client_id, created_at DESC);