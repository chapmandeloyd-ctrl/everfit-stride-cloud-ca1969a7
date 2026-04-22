CREATE TABLE IF NOT EXISTS public.trainer_pdf_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  show_logo boolean NOT NULL DEFAULT true,
  accent_color text NOT NULL DEFAULT '#CC181E',
  footer_text text,
  document_label_override text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_pdf_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage their own PDF branding"
ON public.trainer_pdf_branding
FOR ALL
TO authenticated
USING (trainer_id = auth.uid())
WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Clients can read their trainer's PDF branding"
ON public.trainer_pdf_branding
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_feature_settings cfs
    WHERE cfs.client_id = auth.uid()
      AND cfs.trainer_id = trainer_pdf_branding.trainer_id
  )
);

CREATE TRIGGER trainer_pdf_branding_touch_updated_at
BEFORE UPDATE ON public.trainer_pdf_branding
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();