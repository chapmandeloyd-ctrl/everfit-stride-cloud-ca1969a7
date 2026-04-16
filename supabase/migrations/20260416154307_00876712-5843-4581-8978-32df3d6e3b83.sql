
-- Table for trainer welcome cards
CREATE TABLE public.trainer_welcome_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trainer_id)
);

ALTER TABLE public.trainer_welcome_cards ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their own welcome card
CREATE POLICY "Trainers can manage their welcome card"
  ON public.trainer_welcome_cards
  FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Clients can view their trainer's welcome card
CREATE POLICY "Clients can view trainer welcome card"
  ON public.trainer_welcome_cards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_feature_settings cfs
      WHERE cfs.client_id = auth.uid() AND cfs.trainer_id = trainer_welcome_cards.trainer_id
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_trainer_welcome_cards_updated_at
  BEFORE UPDATE ON public.trainer_welcome_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('welcome-card-images', 'welcome-card-images', true);

-- Storage policies
CREATE POLICY "Trainers can upload welcome card images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'welcome-card-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Welcome card images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'welcome-card-images');

CREATE POLICY "Trainers can update welcome card images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'welcome-card-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Trainers can delete welcome card images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'welcome-card-images' AND auth.uid()::text = (storage.foldername(name))[1]);
