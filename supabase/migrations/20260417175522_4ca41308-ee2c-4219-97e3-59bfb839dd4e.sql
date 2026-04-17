-- ============================================================
-- SMART PACE TRACKER — Phase 1 Foundation
-- ============================================================

-- 1) Feature flag on client_feature_settings
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS smart_pace_enabled boolean NOT NULL DEFAULT false;

-- 2) Smart Pace Goals (one active per client)
CREATE TABLE IF NOT EXISTS public.smart_pace_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  target_date date,
  start_weight numeric(6,2),
  goal_weight numeric(6,2) NOT NULL,
  daily_pace_lbs numeric(4,2) NOT NULL DEFAULT 2.5,
  goal_direction text NOT NULL DEFAULT 'lose' CHECK (goal_direction IN ('lose','gain','maintain')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','abandoned')),
  current_debt_lbs numeric(6,2) NOT NULL DEFAULT 0,
  current_credit_lbs numeric(6,2) NOT NULL DEFAULT 0,
  last_weigh_in_date date,
  last_weigh_in_value numeric(6,2),
  consecutive_missed_days int NOT NULL DEFAULT 0,
  consecutive_behind_days int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ended_reason text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_smart_pace_goals_one_active_per_client
  ON public.smart_pace_goals (client_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_smart_pace_goals_trainer ON public.smart_pace_goals (trainer_id);

ALTER TABLE public.smart_pace_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own pace goals"
  ON public.smart_pace_goals FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Trainers manage their clients pace goals"
  ON public.smart_pace_goals FOR ALL
  USING (trainer_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id))
  WITH CHECK (trainer_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id));

-- 3) Daily Log
CREATE TABLE IF NOT EXISTS public.smart_pace_daily_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.smart_pace_goals(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  target_loss_lbs numeric(5,2) NOT NULL,
  actual_loss_lbs numeric(6,2),
  weight_recorded numeric(6,2),
  weight_source text CHECK (weight_source IN ('healthkit','bluetooth','ai_photo','admin_override','forgiven')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','on_pace','ahead','behind','missed','forgiven')),
  debt_delta numeric(5,2) NOT NULL DEFAULT 0,
  credit_delta numeric(5,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (goal_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_smart_pace_daily_log_client_date
  ON public.smart_pace_daily_log (client_id, log_date DESC);

ALTER TABLE public.smart_pace_daily_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own daily log"
  ON public.smart_pace_daily_log FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Trainers manage clients daily log"
  ON public.smart_pace_daily_log FOR ALL
  USING (public.is_trainer_of_client(auth.uid(), client_id))
  WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));

-- 4) Prescriptions (catch-up plans)
CREATE TABLE IF NOT EXISTS public.smart_pace_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.smart_pace_goals(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prescription_date date NOT NULL,
  generated_by text NOT NULL DEFAULT 'ai' CHECK (generated_by IN ('ai','trainer','admin')),
  severity text NOT NULL DEFAULT 'mild' CHECK (severity IN ('mild','moderate','severe')),
  title text NOT NULL,
  message text NOT NULL,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_makeup_lbs numeric(5,2),
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smart_pace_prescriptions_client_date
  ON public.smart_pace_prescriptions (client_id, prescription_date DESC);

ALTER TABLE public.smart_pace_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own prescriptions"
  ON public.smart_pace_prescriptions FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Clients ack own prescriptions"
  ON public.smart_pace_prescriptions FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Trainers manage clients prescriptions"
  ON public.smart_pace_prescriptions FOR ALL
  USING (public.is_trainer_of_client(auth.uid(), client_id))
  WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));

-- 5) Admin Actions (audit log for manual overrides)
CREATE TABLE IF NOT EXISTS public.smart_pace_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.smart_pace_goals(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  action_type text NOT NULL CHECK (action_type IN ('log_weight','forgive_day','reset_debt','adjust_pace')),
  action_date date NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smart_pace_admin_actions_client
  ON public.smart_pace_admin_actions (client_id, action_date DESC);

ALTER TABLE public.smart_pace_admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers view own admin actions"
  ON public.smart_pace_admin_actions FOR SELECT
  USING (admin_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainers insert admin actions"
  ON public.smart_pace_admin_actions FOR INSERT
  WITH CHECK (admin_id = auth.uid() AND public.is_trainer_of_client(auth.uid(), client_id));

-- 6) updated_at triggers
CREATE TRIGGER smart_pace_goals_updated_at
  BEFORE UPDATE ON public.smart_pace_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER smart_pace_daily_log_updated_at
  BEFORE UPDATE ON public.smart_pace_daily_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();