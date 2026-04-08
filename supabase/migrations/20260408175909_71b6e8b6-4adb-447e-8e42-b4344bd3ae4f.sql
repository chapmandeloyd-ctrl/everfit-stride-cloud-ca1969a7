
-- Keto categories (groupings like Strict Keto, Performance Keto, etc.)
CREATE TABLE public.keto_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'Zap',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.keto_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage own keto categories"
  ON public.keto_categories FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Clients view trainer keto categories"
  ON public.keto_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_feature_settings cfs
      WHERE cfs.client_id = auth.uid() AND cfs.trainer_id = keto_categories.trainer_id
    )
  );

-- Keto types (individual diet types)
CREATE TABLE public.keto_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.keto_categories(id) ON DELETE CASCADE,
  abbreviation TEXT NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  fat_pct INT NOT NULL DEFAULT 70,
  protein_pct INT NOT NULL DEFAULT 25,
  carbs_pct INT NOT NULL DEFAULT 5,
  carb_limit_grams INT,
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  engine_compatibility TEXT NOT NULL DEFAULT 'both',
  how_it_works TEXT,
  built_for TEXT[] DEFAULT '{}',
  coach_notes TEXT[] DEFAULT '{}',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  order_index INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.keto_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage own keto types"
  ON public.keto_types FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Clients view trainer keto types"
  ON public.keto_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_feature_settings cfs
      WHERE cfs.client_id = auth.uid() AND cfs.trainer_id = keto_types.trainer_id
    )
  );

-- Client keto assignments
CREATE TABLE public.client_keto_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  keto_type_id UUID NOT NULL REFERENCES public.keto_types(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_keto_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage client keto assignments"
  ON public.client_keto_assignments FOR ALL
  TO authenticated
  USING (assigned_by = auth.uid())
  WITH CHECK (assigned_by = auth.uid());

CREATE POLICY "Clients view own keto assignments"
  ON public.client_keto_assignments FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_keto_categories_updated_at
  BEFORE UPDATE ON public.keto_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_keto_types_updated_at
  BEFORE UPDATE ON public.keto_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_keto_assignments_updated_at
  BEFORE UPDATE ON public.client_keto_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
