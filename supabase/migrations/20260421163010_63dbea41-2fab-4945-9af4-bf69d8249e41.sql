
-- ============================================
-- push_subscriptions: per-device subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  device_label text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own push subs"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own push subs"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own push subs"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own push subs"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers view client push subs"
  ON public.push_subscriptions FOR SELECT
  USING (public.is_trainer_of_client(auth.uid(), user_id));

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- notification_log: delivery attempts
-- ============================================
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,                  -- 'health_reminder' | 'habit' | 'task' | 'nudge' | 'fasting_milestone' | 'test'
  reference_id text,                   -- e.g., reminder time slot, habit id, fasting milestone hours
  title text,
  body text,
  status text NOT NULL DEFAULT 'sent', -- 'sent' | 'failed' | 'skipped'
  error text,
  subscription_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_kind
  ON public.notification_log(user_id, kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_log_dedupe
  ON public.notification_log(user_id, kind, reference_id, created_at DESC);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notification log"
  ON public.notification_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers view client notification log"
  ON public.notification_log FOR SELECT
  USING (public.is_trainer_of_client(auth.uid(), user_id));

-- Inserts happen via service role only (no policy needed for that).
