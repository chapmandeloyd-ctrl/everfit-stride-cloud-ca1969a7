
CREATE TABLE public.plan_synergy_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_type TEXT NOT NULL DEFAULT 'quick_plan',
  protocol_id UUID NOT NULL,
  keto_type_id UUID NOT NULL REFERENCES public.keto_types(id) ON DELETE CASCADE,
  protocol_name TEXT NOT NULL,
  keto_type_name TEXT NOT NULL,
  synergy_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(protocol_type, protocol_id, keto_type_id)
);

ALTER TABLE public.plan_synergy_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read synergy content"
  ON public.plan_synergy_content FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Trainers can manage synergy content"
  ON public.plan_synergy_content FOR ALL
  TO authenticated
  USING (public.is_trainer(auth.uid()));

CREATE TRIGGER update_plan_synergy_content_updated_at
  BEFORE UPDATE ON public.plan_synergy_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
