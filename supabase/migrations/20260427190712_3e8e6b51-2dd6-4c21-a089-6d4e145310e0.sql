
-- Water log entries
CREATE TABLE public.water_log_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  amount_oz NUMERIC NOT NULL CHECK (amount_oz > 0),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_water_log_client_logged ON public.water_log_entries(client_id, logged_at DESC);

ALTER TABLE public.water_log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own water entries"
ON public.water_log_entries FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Clients insert own water entries"
ON public.water_log_entries FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients update own water entries"
ON public.water_log_entries FOR UPDATE
USING (auth.uid() = client_id);

CREATE POLICY "Clients delete own water entries"
ON public.water_log_entries FOR DELETE
USING (auth.uid() = client_id);

CREATE POLICY "Trainers view assigned client water entries"
ON public.water_log_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_feature_settings cfs
    WHERE cfs.client_id = water_log_entries.client_id
      AND cfs.trainer_id = auth.uid()
  )
);

-- Water goal settings (one per client)
CREATE TABLE public.water_goal_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE,
  daily_goal_oz NUMERIC NOT NULL DEFAULT 64 CHECK (daily_goal_oz > 0),
  serving_size_oz NUMERIC NOT NULL DEFAULT 8 CHECK (serving_size_oz > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.water_goal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own water goal"
ON public.water_goal_settings FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Clients insert own water goal"
ON public.water_goal_settings FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients update own water goal"
ON public.water_goal_settings FOR UPDATE
USING (auth.uid() = client_id);

CREATE POLICY "Trainers view assigned client water goal"
ON public.water_goal_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_feature_settings cfs
    WHERE cfs.client_id = water_goal_settings.client_id
      AND cfs.trainer_id = auth.uid()
  )
);

CREATE TRIGGER trg_water_goal_updated_at
BEFORE UPDATE ON public.water_goal_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
