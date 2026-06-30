
CREATE TABLE public.supplements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_dose TEXT,
  default_timing TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplements TO authenticated;
GRANT ALL ON public.supplements TO service_role;
ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage their own supplements"
  ON public.supplements FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Assigned clients can read trainer supplements"
  ON public.supplements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_feature_settings cfs
      WHERE cfs.client_id = auth.uid() AND cfs.trainer_id = supplements.trainer_id
    )
  );

CREATE TRIGGER trg_supplements_updated_at
  BEFORE UPDATE ON public.supplements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.protocol_daily_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_id UUID,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  keto_mode TEXT NOT NULL DEFAULT 'simple' CHECK (keto_mode IN ('simple','advanced')),
  default_keto_type TEXT CHECK (default_keto_type IN ('SKD','TKD','HPKD','CKD')),
  active_days INT[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uniq_schedule_per_client_protocol
  ON public.protocol_daily_schedules(protocol_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.protocol_daily_schedules TO authenticated;
GRANT ALL ON public.protocol_daily_schedules TO service_role;
ALTER TABLE public.protocol_daily_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage own schedules"
  ON public.protocol_daily_schedules FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Clients read their own (or template) schedules"
  ON public.protocol_daily_schedules FOR SELECT
  USING (
    client_id = auth.uid()
    OR (
      client_id IS NULL AND EXISTS (
        SELECT 1 FROM public.client_feature_settings cfs
        WHERE cfs.client_id = auth.uid() AND cfs.trainer_id = protocol_daily_schedules.trainer_id
      )
    )
  );

CREATE TRIGGER trg_schedules_updated_at
  BEFORE UPDATE ON public.protocol_daily_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.protocol_schedule_keto_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.protocol_daily_schedules(id) ON DELETE CASCADE,
  weekday INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  keto_type TEXT NOT NULL CHECK (keto_type IN ('SKD','TKD','HPKD','CKD')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.protocol_schedule_keto_overrides TO authenticated;
GRANT ALL ON public.protocol_schedule_keto_overrides TO service_role;
ALTER TABLE public.protocol_schedule_keto_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage overrides via parent schedule"
  ON public.protocol_schedule_keto_overrides FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.protocol_daily_schedules s
            WHERE s.id = schedule_id AND s.trainer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.protocol_daily_schedules s
            WHERE s.id = schedule_id AND s.trainer_id = auth.uid())
  );

CREATE POLICY "Clients read overrides for visible schedules"
  ON public.protocol_schedule_keto_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.protocol_daily_schedules s
      WHERE s.id = schedule_id
        AND (s.client_id = auth.uid()
             OR (s.client_id IS NULL AND EXISTS (
                  SELECT 1 FROM public.client_feature_settings cfs
                  WHERE cfs.client_id = auth.uid() AND cfs.trainer_id = s.trainer_id
                )))
    )
  );


CREATE TABLE public.protocol_schedule_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.protocol_daily_schedules(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  time_of_day TIME,
  relative_trigger TEXT CHECK (relative_trigger IN ('pre_workout','post_workout','wakeup','sleep','window_open','window_close')),
  offset_minutes INT DEFAULT 0,
  note TEXT,
  supplement_id UUID REFERENCES public.supplements(id) ON DELETE SET NULL,
  keto_type_filter TEXT[] DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.protocol_schedule_items TO authenticated;
GRANT ALL ON public.protocol_schedule_items TO service_role;
ALTER TABLE public.protocol_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage items via parent schedule"
  ON public.protocol_schedule_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.protocol_daily_schedules s
            WHERE s.id = schedule_id AND s.trainer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.protocol_daily_schedules s
            WHERE s.id = schedule_id AND s.trainer_id = auth.uid())
  );

CREATE POLICY "Clients read items for visible schedules"
  ON public.protocol_schedule_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.protocol_daily_schedules s
      WHERE s.id = schedule_id
        AND (s.client_id = auth.uid()
             OR (s.client_id IS NULL AND EXISTS (
                  SELECT 1 FROM public.client_feature_settings cfs
                  WHERE cfs.client_id = auth.uid() AND cfs.trainer_id = s.trainer_id
                )))
    )
  );

CREATE TRIGGER trg_schedule_items_updated_at
  BEFORE UPDATE ON public.protocol_schedule_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
