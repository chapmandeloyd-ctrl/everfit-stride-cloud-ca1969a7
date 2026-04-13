
-- ============================================
-- 1. Daily Meal Behavior Signals
-- ============================================
CREATE TABLE public.client_meal_behavior (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tracked_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Meal interactions
  meals_shown INT NOT NULL DEFAULT 0,
  meals_selected INT NOT NULL DEFAULT 0,
  meals_completed INT NOT NULL DEFAULT 0,
  
  -- Macro compliance
  protein_target_hit BOOLEAN DEFAULT false,
  carbs_exceeded BOOLEAN DEFAULT false,
  fat_deviation NUMERIC(5,2) DEFAULT 0,
  
  -- Fasting
  fast_completed BOOLEAN DEFAULT false,
  fast_broken_early BOOLEAN DEFAULT false,
  fasting_window_adherence NUMERIC(5,2) DEFAULT 0,
  
  -- Hunger levels (1-10 scale)
  hunger_break_fast INT DEFAULT NULL,
  hunger_mid_window INT DEFAULT NULL,
  hunger_last_meal INT DEFAULT NULL,
  
  -- User action counts
  coach_picks_used INT NOT NULL DEFAULT 0,
  manual_meal_entries INT NOT NULL DEFAULT 0,
  barcode_scans INT NOT NULL DEFAULT 0,
  ai_photo_logs INT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(client_id, tracked_date)
);

ALTER TABLE public.client_meal_behavior ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own meal behavior"
  ON public.client_meal_behavior FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert own meal behavior"
  ON public.client_meal_behavior FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own meal behavior"
  ON public.client_meal_behavior FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view client meal behavior"
  ON public.client_meal_behavior FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid() AND tc.client_id = client_meal_behavior.client_id
    )
  );

CREATE INDEX idx_meal_behavior_client_date ON public.client_meal_behavior(client_id, tracked_date DESC);

-- ============================================
-- 2. Per-Meal Adaptive Scores
-- ============================================
CREATE TABLE public.client_meal_adaptive_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  
  score_adjustment INT NOT NULL DEFAULT 0,
  adjustment_reason TEXT DEFAULT NULL, -- 'preference', 'compliance', 'hunger', 'variety'
  
  times_shown INT NOT NULL DEFAULT 0,
  times_selected INT NOT NULL DEFAULT 0,
  times_ignored INT NOT NULL DEFAULT 0,
  
  last_shown_at TIMESTAMPTZ DEFAULT NULL,
  last_selected_at TIMESTAMPTZ DEFAULT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(client_id, recipe_id)
);

ALTER TABLE public.client_meal_adaptive_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own adaptive scores"
  ON public.client_meal_adaptive_scores FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view client adaptive scores"
  ON public.client_meal_adaptive_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid() AND tc.client_id = client_meal_adaptive_scores.client_id
    )
  );

CREATE INDEX idx_adaptive_scores_client ON public.client_meal_adaptive_scores(client_id);
CREATE INDEX idx_adaptive_scores_recipe ON public.client_meal_adaptive_scores(client_id, recipe_id);

-- ============================================
-- 3. Weekly Adaptive Profile
-- ============================================
CREATE TABLE public.client_adaptive_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  week_start DATE NOT NULL,
  consistency_score NUMERIC(5,2) DEFAULT 0,
  profile_type TEXT NOT NULL DEFAULT 'inconsistent', -- 'consistent', 'inconsistent', 'struggling'
  
  preferred_meal_pattern TEXT DEFAULT NULL, -- 'repetitive', 'varied', 'mixed'
  avg_hunger_break_fast NUMERIC(3,1) DEFAULT NULL,
  avg_hunger_mid_window NUMERIC(3,1) DEFAULT NULL,
  avg_hunger_last_meal NUMERIC(3,1) DEFAULT NULL,
  
  protein_compliance_rate NUMERIC(5,2) DEFAULT 0,
  carb_compliance_rate NUMERIC(5,2) DEFAULT 0,
  fasting_adherence_rate NUMERIC(5,2) DEFAULT 0,
  
  scoring_precision TEXT NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(client_id, week_start)
);

ALTER TABLE public.client_adaptive_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own adaptive profile"
  ON public.client_adaptive_profile FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view client adaptive profile"
  ON public.client_adaptive_profile FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid() AND tc.client_id = client_adaptive_profile.client_id
    )
  );

CREATE INDEX idx_adaptive_profile_client_week ON public.client_adaptive_profile(client_id, week_start DESC);

-- Triggers for updated_at
CREATE TRIGGER update_client_meal_behavior_updated_at
  BEFORE UPDATE ON public.client_meal_behavior
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_client_meal_adaptive_scores_updated_at
  BEFORE UPDATE ON public.client_meal_adaptive_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_client_adaptive_profile_updated_at
  BEFORE UPDATE ON public.client_adaptive_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
