-- ============ Table ============
CREATE TABLE public.daily_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT,                         -- e.g. 'good' | 'energized' | 'happy' | 'calm' | 'tired' | 'stressed'
  body_feelings TEXT[] NOT NULL DEFAULT '{}',  -- ['fine','hungry',...]
  meals_count TEXT,                  -- '1' | '2' | '3' | '4+'
  snacks_count INT CHECK (snacks_count >= 0 AND snacks_count <= 10),
  meals_quality TEXT,                -- 'healthy' | 'unhealthy' | 'mixed'
  note TEXT,
  photo_path TEXT,                   -- storage object path in daily-journal-photos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, entry_date)
);

CREATE INDEX idx_daily_journal_client_date
  ON public.daily_journal_entries (client_id, entry_date DESC);

ALTER TABLE public.daily_journal_entries ENABLE ROW LEVEL SECURITY;

-- Client policies
CREATE POLICY "Clients view own journal"
  ON public.daily_journal_entries FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients insert own journal"
  ON public.daily_journal_entries FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients update own journal"
  ON public.daily_journal_entries FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Clients delete own journal"
  ON public.daily_journal_entries FOR DELETE
  USING (auth.uid() = client_id);

-- Trainer view
CREATE POLICY "Trainers view client journal"
  ON public.daily_journal_entries FOR SELECT
  USING (public.is_trainer_of_client(auth.uid(), client_id));

-- Updated-at trigger
CREATE TRIGGER trg_daily_journal_updated_at
  BEFORE UPDATE ON public.daily_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('daily-journal-photos', 'daily-journal-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Client owns their folder (first path segment = client_id)
CREATE POLICY "Clients view own journal photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'daily-journal-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Clients upload own journal photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'daily-journal-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Clients update own journal photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'daily-journal-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Clients delete own journal photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'daily-journal-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trainers can view their clients' photos
CREATE POLICY "Trainers view client journal photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'daily-journal-photos'
    AND public.is_trainer_of_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );