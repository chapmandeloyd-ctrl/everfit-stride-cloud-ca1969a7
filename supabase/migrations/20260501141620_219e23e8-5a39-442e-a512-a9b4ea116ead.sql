-- Beverage category enum
CREATE TYPE public.beverage_category AS ENUM (
  'zero_sugar_soda',
  'zero_cal_energy',
  'zero_cal_bcaa',
  'black_coffee_splenda',
  'tea_lemon_splenda',
  'caution',
  'breaks_fast'
);

CREATE TYPE public.beverage_source AS ENUM ('manual', 'photo', 'barcode');

-- Saved favorites library
CREATE TABLE public.client_beverages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  category public.beverage_category NOT NULL,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fats NUMERIC NOT NULL DEFAULT 0,
  source public.beverage_source NOT NULL DEFAULT 'manual',
  barcode TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_beverages_client ON public.client_beverages(client_id, category);

ALTER TABLE public.client_beverages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own beverages"
  ON public.client_beverages FOR SELECT
  USING (auth.uid() = client_id OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Clients insert own beverages"
  ON public.client_beverages FOR INSERT
  WITH CHECK (auth.uid() = client_id OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Clients update own beverages"
  ON public.client_beverages FOR UPDATE
  USING (auth.uid() = client_id OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Clients delete own beverages"
  ON public.client_beverages FOR DELETE
  USING (auth.uid() = client_id OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE TRIGGER trg_client_beverages_updated
  BEFORE UPDATE ON public.client_beverages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily consumption log
CREATE TABLE public.beverage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  beverage_id UUID REFERENCES public.client_beverages(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category public.beverage_category NOT NULL,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fats NUMERIC NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fasting_log_id UUID,
  broke_fast BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_beverage_logs_client_day ON public.beverage_logs(client_id, consumed_at DESC);

ALTER TABLE public.beverage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own beverage logs"
  ON public.beverage_logs FOR SELECT
  USING (auth.uid() = client_id OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Clients insert own beverage logs"
  ON public.beverage_logs FOR INSERT
  WITH CHECK (auth.uid() = client_id OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Clients update own beverage logs"
  ON public.beverage_logs FOR UPDATE
  USING (auth.uid() = client_id OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Clients delete own beverage logs"
  ON public.beverage_logs FOR DELETE
  USING (auth.uid() = client_id OR public.is_trainer_of_client(auth.uid(), client_id));