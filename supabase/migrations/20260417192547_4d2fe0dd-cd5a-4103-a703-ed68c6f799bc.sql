-- ========================================
-- Goal Motivations table (one per goal)
-- ========================================
CREATE TABLE public.goal_motivations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  trainer_id UUID,
  goal_id UUID,
  why_text TEXT,
  why_image_url TEXT,
  why_audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_motivations_client ON public.goal_motivations(client_id);
CREATE INDEX idx_goal_motivations_goal ON public.goal_motivations(goal_id);
CREATE UNIQUE INDEX idx_goal_motivations_unique_goal ON public.goal_motivations(goal_id) WHERE goal_id IS NOT NULL;

ALTER TABLE public.goal_motivations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own motivation"
  ON public.goal_motivations FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients insert own motivation"
  ON public.goal_motivations FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients update own motivation"
  ON public.goal_motivations FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Clients delete own motivation"
  ON public.goal_motivations FOR DELETE
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers view client motivation"
  ON public.goal_motivations FOR SELECT
  USING (public.is_trainer_of_client(auth.uid(), client_id));

CREATE TRIGGER trg_goal_motivations_updated
  BEFORE UPDATE ON public.goal_motivations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ========================================
-- Goal Journal Entries table (one per day per client)
-- ========================================
CREATE TABLE public.goal_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  trainer_id UUID,
  goal_id UUID,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_emoji TEXT,
  motivation_level SMALLINT CHECK (motivation_level BETWEEN 1 AND 10),
  quick_note TEXT,
  long_note TEXT,
  share_with_coach BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, entry_date)
);

CREATE INDEX idx_journal_client_date ON public.goal_journal_entries(client_id, entry_date DESC);
CREATE INDEX idx_journal_goal ON public.goal_journal_entries(goal_id);

ALTER TABLE public.goal_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own journal"
  ON public.goal_journal_entries FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients insert own journal"
  ON public.goal_journal_entries FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients update own journal"
  ON public.goal_journal_entries FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Clients delete own journal"
  ON public.goal_journal_entries FOR DELETE
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers view shared journal entries"
  ON public.goal_journal_entries FOR SELECT
  USING (
    share_with_coach = true
    AND public.is_trainer_of_client(auth.uid(), client_id)
  );

CREATE TRIGGER trg_journal_updated
  BEFORE UPDATE ON public.goal_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ========================================
-- Storage bucket for motivation media
-- ========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('goal-motivation-media', 'goal-motivation-media', false)
ON CONFLICT (id) DO NOTHING;

-- Clients manage their own files (folder = their user id)
CREATE POLICY "Clients view own motivation media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'goal-motivation-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Clients upload own motivation media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'goal-motivation-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Clients update own motivation media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'goal-motivation-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Clients delete own motivation media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'goal-motivation-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trainers can view their client's motivation media
CREATE POLICY "Trainers view client motivation media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'goal-motivation-media'
    AND public.is_trainer_of_client(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
  );