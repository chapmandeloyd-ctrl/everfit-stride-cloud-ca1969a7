INSERT INTO storage.buckets (id, name, public) VALUES ('explore-content', 'explore-content', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Explore content images publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'explore-content');

CREATE POLICY "Trainers can upload explore content images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'explore-content' AND public.is_trainer(auth.uid()));

CREATE POLICY "Trainers can update explore content images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'explore-content' AND public.is_trainer(auth.uid()));

CREATE POLICY "Trainers can delete explore content images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'explore-content' AND public.is_trainer(auth.uid()));