-- Sleep sessions: stores in-bed/asleep intervals for bedtime/wake bar chart
CREATE TABLE IF NOT EXISTS public.sleep_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'apple_health',
  stage TEXT, -- optional: 'inBed' | 'asleep' | 'rem' | 'core' | 'deep'
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sleep_sessions_unique UNIQUE (client_id, started_at, ended_at, source)
);

CREATE INDEX IF NOT EXISTS idx_sleep_sessions_client_start
  ON public.sleep_sessions (client_id, started_at DESC);

ALTER TABLE public.sleep_sessions ENABLE ROW LEVEL SECURITY;

-- Clients see/manage their own sleep sessions
CREATE POLICY "Clients can view own sleep sessions"
  ON public.sleep_sessions FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert own sleep sessions"
  ON public.sleep_sessions FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own sleep sessions"
  ON public.sleep_sessions FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete own sleep sessions"
  ON public.sleep_sessions FOR DELETE
  USING (auth.uid() = client_id);

-- Trainers can view their assigned clients' sleep sessions
CREATE POLICY "Trainers can view assigned clients sleep sessions"
  ON public.sleep_sessions FOR SELECT
  USING (public.is_trainer_of_client(auth.uid(), client_id));