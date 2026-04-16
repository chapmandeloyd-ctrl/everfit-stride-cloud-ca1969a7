
CREATE TABLE public.trainer_fasting_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trainer_id)
);

ALTER TABLE public.trainer_fasting_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their fasting card"
  ON public.trainer_fasting_cards
  FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Clients can view trainer fasting card"
  ON public.trainer_fasting_cards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_feature_settings cfs
      WHERE cfs.client_id = auth.uid() AND cfs.trainer_id = trainer_fasting_cards.trainer_id
    )
  );

CREATE TRIGGER update_trainer_fasting_cards_updated_at
  BEFORE UPDATE ON public.trainer_fasting_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
