-- Consistency streak tracking
CREATE TABLE public.client_consistency_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_scored_date DATE,
  last_score_label TEXT,
  milestone_3 BOOLEAN NOT NULL DEFAULT false,
  milestone_7 BOOLEAN NOT NULL DEFAULT false,
  milestone_14 BOOLEAN NOT NULL DEFAULT false,
  milestone_30 BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_consistency_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak"
  ON public.client_consistency_streaks FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Users can insert own streak"
  ON public.client_consistency_streaks FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own streak"
  ON public.client_consistency_streaks FOR UPDATE
  USING (auth.uid() = client_id);

CREATE TRIGGER update_streaks_updated_at
  BEFORE UPDATE ON public.client_consistency_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();