CREATE TABLE public.ai_plan_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','accepted','adjusted','rejected','superseded')),
  onboarding_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  reasoning jsonb NOT NULL DEFAULT '[]'::jsonb,
  expectations jsonb NOT NULL DEFAULT '[]'::jsonb,
  schedule_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  regenerate_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_plan_proposals_client_created_idx
  ON public.ai_plan_proposals(client_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.ai_plan_proposals TO authenticated;
GRANT ALL ON public.ai_plan_proposals TO service_role;

ALTER TABLE public.ai_plan_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients read own AI plan proposals"
  ON public.ai_plan_proposals FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Clients insert own AI plan proposals"
  ON public.ai_plan_proposals FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Clients update own AI plan proposals"
  ON public.ai_plan_proposals FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id))
  WITH CHECK (client_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id));

CREATE TRIGGER ai_plan_proposals_updated_at
  BEFORE UPDATE ON public.ai_plan_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();