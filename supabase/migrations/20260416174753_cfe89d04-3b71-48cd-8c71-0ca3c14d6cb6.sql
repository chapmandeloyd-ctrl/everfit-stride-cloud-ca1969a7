
-- Portal scenes table — independent from vibes_sounds
CREATE TABLE public.portal_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'nature',
  thumbnail_url text,
  video_url text NOT NULL,
  audio_url text,
  audio_volume numeric NOT NULL DEFAULT 0.7,
  loop_video boolean NOT NULL DEFAULT true,
  is_premium boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage their own scenes"
  ON public.portal_scenes FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Clients view active scenes from their trainer"
  ON public.portal_scenes FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.client_feature_settings cfs
      WHERE cfs.client_id = auth.uid()
        AND cfs.trainer_id = portal_scenes.trainer_id
    )
  );

CREATE TRIGGER trg_portal_scenes_updated_at
  BEFORE UPDATE ON public.portal_scenes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_portal_scenes_trainer ON public.portal_scenes(trainer_id, sort_order);

-- Storage bucket for Portal videos (Cloudflare-friendly public bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('portal-videos', 'portal-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Portal videos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portal-videos');

CREATE POLICY "Trainers upload Portal videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'portal-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Trainers update Portal videos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'portal-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Trainers delete Portal videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'portal-videos' AND auth.role() = 'authenticated');
