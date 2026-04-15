-- Adaptive Macro Adjustments table
CREATE TABLE public.adaptive_macro_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  base_protein NUMERIC NOT NULL,
  base_fat NUMERIC NOT NULL,
  base_carbs NUMERIC NOT NULL,
  base_calories NUMERIC NOT NULL,
  adjusted_protein NUMERIC NOT NULL,
  adjusted_fat NUMERIC NOT NULL,
  adjusted_carbs NUMERIC NOT NULL,
  adjusted_calories NUMERIC NOT NULL,
  adjustment_reason TEXT NOT NULL,
  rule_triggered TEXT NOT NULL,
  macro_adherence_pct NUMERIC,
  fasting_adherence_pct NUMERIC,
  daily_score_avg NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast active lookup
CREATE INDEX idx_adaptive_macro_client_active ON public.adaptive_macro_adjustments (client_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.adaptive_macro_adjustments ENABLE ROW LEVEL SECURITY;

-- Clients can read their own adjustments
CREATE POLICY "Clients can view own adaptive macros"
ON public.adaptive_macro_adjustments
FOR SELECT
TO authenticated
USING (client_id = auth.uid());

-- Trainers can view adjustments for their clients
CREATE POLICY "Trainers can view client adaptive macros"
ON public.adaptive_macro_adjustments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_feature_settings cfs
    WHERE cfs.client_id = adaptive_macro_adjustments.client_id
      AND cfs.trainer_id = auth.uid()
  )
);

-- Trainers can insert adjustments for their clients
CREATE POLICY "Trainers can insert client adaptive macros"
ON public.adaptive_macro_adjustments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_feature_settings cfs
    WHERE cfs.client_id = adaptive_macro_adjustments.client_id
      AND cfs.trainer_id = auth.uid()
  )
);

-- Trainers can update adjustments for their clients
CREATE POLICY "Trainers can update client adaptive macros"
ON public.adaptive_macro_adjustments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_feature_settings cfs
    WHERE cfs.client_id = adaptive_macro_adjustments.client_id
      AND cfs.trainer_id = auth.uid()
  )
);

-- Service role / edge functions need full access
CREATE POLICY "Service role full access adaptive macros"
ON public.adaptive_macro_adjustments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Auto-update timestamp
CREATE TRIGGER update_adaptive_macro_adjustments_updated_at
BEFORE UPDATE ON public.adaptive_macro_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for adjustment notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.adaptive_macro_adjustments;
