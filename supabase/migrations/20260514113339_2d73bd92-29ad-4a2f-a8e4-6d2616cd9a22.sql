-- Metabolic profile
CREATE TABLE IF NOT EXISTS public.user_metabolic_profile (
  client_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  age integer,
  sex text,
  height_cm numeric,
  weight_kg numeric,
  goal_weight_kg numeric,
  bmi numeric,
  bmi_class text,
  activity_level text,
  goals text[] DEFAULT '{}'::text[],
  metabolic_score integer,
  metabolic_strain text,
  fasting_experience_level text,
  longest_fast_hours integer,
  fasting_tolerance text,
  safety_flags text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_metabolic_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client manages own metabolic profile"
ON public.user_metabolic_profile
FOR ALL
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Trainer views client metabolic profile"
ON public.user_metabolic_profile
FOR SELECT
USING (public.is_trainer_of_client(auth.uid(), client_id));

CREATE TRIGGER trg_user_metabolic_profile_updated
BEFORE UPDATE ON public.user_metabolic_profile
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Synergy selection
CREATE TABLE IF NOT EXISTS public.fasting_synergy_selection (
  client_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  synergy_key text NOT NULL,
  recommended_synergy text,
  coaching_style text,
  selected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fasting_synergy_selection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client manages own synergy selection"
ON public.fasting_synergy_selection
FOR ALL
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Trainer views client synergy selection"
ON public.fasting_synergy_selection
FOR SELECT
USING (public.is_trainer_of_client(auth.uid(), client_id));

CREATE TRIGGER trg_fasting_synergy_selection_updated
BEFORE UPDATE ON public.fasting_synergy_selection
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Onboarding progress
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  client_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 1,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client manages own onboarding progress"
ON public.onboarding_progress
FOR ALL
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Trainer views client onboarding progress"
ON public.onboarding_progress
FOR SELECT
USING (public.is_trainer_of_client(auth.uid(), client_id));

CREATE TRIGGER trg_onboarding_progress_updated
BEFORE UPDATE ON public.onboarding_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();