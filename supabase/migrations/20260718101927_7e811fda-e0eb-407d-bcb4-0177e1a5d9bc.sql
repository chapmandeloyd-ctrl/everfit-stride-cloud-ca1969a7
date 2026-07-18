
-- Weekly schedule per client (base)
CREATE TABLE public.client_weekly_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  ratio TEXT NOT NULL DEFAULT '16:8' CHECK (ratio IN ('16:8','18:6','20:4','eat_all_day')),
  window_start_time TIME NOT NULL DEFAULT '12:00',
  window_end_time TIME NOT NULL DEFAULT '20:00',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, day_of_week)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_weekly_schedule TO authenticated;
GRANT ALL ON public.client_weekly_schedule TO service_role;

ALTER TABLE public.client_weekly_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client can view own weekly schedule"
  ON public.client_weekly_schedule FOR SELECT
  USING (client_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainer or client can insert weekly schedule"
  ON public.client_weekly_schedule FOR INSERT
  WITH CHECK (client_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainer or client can update weekly schedule"
  ON public.client_weekly_schedule FOR UPDATE
  USING (client_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainer or client can delete weekly schedule"
  ON public.client_weekly_schedule FOR DELETE
  USING (client_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE TRIGGER trg_client_weekly_schedule_updated
  BEFORE UPDATE ON public.client_weekly_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Date-range overrides (vacation etc.)
CREATE TABLE public.client_schedule_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Override',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  schedule JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_client_schedule_overrides_client_dates
  ON public.client_schedule_overrides(client_id, start_date, end_date) WHERE active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_schedule_overrides TO authenticated;
GRANT ALL ON public.client_schedule_overrides TO service_role;

ALTER TABLE public.client_schedule_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client can view own schedule overrides"
  ON public.client_schedule_overrides FOR SELECT
  USING (client_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainer or client can insert schedule overrides"
  ON public.client_schedule_overrides FOR INSERT
  WITH CHECK (client_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainer or client can update schedule overrides"
  ON public.client_schedule_overrides FOR UPDATE
  USING (client_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainer or client can delete schedule overrides"
  ON public.client_schedule_overrides FOR DELETE
  USING (client_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE TRIGGER trg_client_schedule_overrides_updated
  BEFORE UPDATE ON public.client_schedule_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: seed default 16:8 (12PM-8PM) weekly schedule for every existing client profile
INSERT INTO public.client_weekly_schedule (client_id, day_of_week, ratio, window_start_time, window_end_time)
SELECT p.id, d, '16:8', '12:00'::time, '20:00'::time
FROM public.profiles p
CROSS JOIN generate_series(0,6) d
WHERE p.role = 'client'
ON CONFLICT (client_id, day_of_week) DO NOTHING;
