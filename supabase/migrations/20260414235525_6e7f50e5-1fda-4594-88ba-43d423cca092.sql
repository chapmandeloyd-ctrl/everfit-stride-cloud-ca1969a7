CREATE TABLE public.macro_corrections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  meal_name text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  original_calories numeric,
  original_protein numeric,
  original_fats numeric,
  original_carbs numeric,
  corrected_calories numeric,
  corrected_protein numeric,
  corrected_fats numeric,
  corrected_carbs numeric,
  correction_flags text[] NOT NULL DEFAULT '{}',
  suggestion_text text,
  user_action text NOT NULL DEFAULT 'pending',
  final_calories numeric,
  final_protein numeric,
  final_fats numeric,
  final_carbs numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.macro_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own corrections"
  ON public.macro_corrections FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Users can insert own corrections"
  ON public.macro_corrections FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update own corrections"
  ON public.macro_corrections FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Trainers can view client corrections"
  ON public.macro_corrections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_feature_settings cfs
      WHERE cfs.client_id = macro_corrections.client_id
        AND cfs.trainer_id = auth.uid()
    )
  );

CREATE INDEX idx_macro_corrections_client ON public.macro_corrections (client_id, created_at DESC);