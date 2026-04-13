
-- Habit loop notification log
CREATE TABLE public.habit_loop_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('pre_window','break_fast','mid_window','last_meal','streak_protection','daily_score')),
  message TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  engaged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_habit_loop_notif_client ON public.habit_loop_notifications(client_id, scheduled_for DESC);

ALTER TABLE public.habit_loop_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own habit loop notifications"
  ON public.habit_loop_notifications FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers see client habit loop notifications"
  ON public.habit_loop_notifications FOR SELECT
  USING (public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "System can insert habit loop notifications"
  ON public.habit_loop_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own habit loop notifications"
  ON public.habit_loop_notifications FOR UPDATE
  USING (auth.uid() = client_id);

-- Habit loop preferences
CREATE TABLE public.habit_loop_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  max_daily_notifications INT NOT NULL DEFAULT 3,
  reduce_if_ignored BOOLEAN NOT NULL DEFAULT true,
  pre_window_enabled BOOLEAN NOT NULL DEFAULT true,
  break_fast_enabled BOOLEAN NOT NULL DEFAULT true,
  mid_window_enabled BOOLEAN NOT NULL DEFAULT true,
  last_meal_enabled BOOLEAN NOT NULL DEFAULT true,
  streak_protection_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_score_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.habit_loop_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own habit loop prefs"
  ON public.habit_loop_preferences FOR ALL
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Trainers view client habit loop prefs"
  ON public.habit_loop_preferences FOR SELECT
  USING (public.is_trainer_of_client(auth.uid(), client_id));

CREATE TRIGGER update_habit_loop_prefs_updated_at
  BEFORE UPDATE ON public.habit_loop_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
