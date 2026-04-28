-- =========================================
-- EXPLORE CONTENT
-- =========================================
CREATE TABLE public.explore_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  type TEXT NOT NULL CHECK (type IN ('article','video','audio')),
  category TEXT NOT NULL CHECK (category IN ('fuel','train','restore','general')),
  image_url TEXT,
  author TEXT,
  body TEXT,
  cta_label TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  featured_rank INTEGER,
  popular_rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.explore_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view published content"
ON public.explore_content FOR SELECT TO authenticated
USING (is_published = true);

CREATE POLICY "Trainers can manage content"
ON public.explore_content FOR ALL TO authenticated
USING (public.is_trainer(auth.uid()))
WITH CHECK (public.is_trainer(auth.uid()));

CREATE TRIGGER explore_content_touch_updated
BEFORE UPDATE ON public.explore_content
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_explore_content_type ON public.explore_content(type);
CREATE INDEX idx_explore_content_category ON public.explore_content(category);
CREATE INDEX idx_explore_content_featured ON public.explore_content(featured_rank) WHERE featured_rank IS NOT NULL;
CREATE INDEX idx_explore_content_popular ON public.explore_content(popular_rank) WHERE popular_rank IS NOT NULL;

-- =========================================
-- CHALLENGES
-- =========================================
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  type TEXT NOT NULL CHECK (type IN ('fasting','sleep','movement','journal','nutrition')),
  duration_days INTEGER NOT NULL,
  target_value NUMERIC,            -- e.g. 7 (fasts), 200 (hours), 70 (minutes)
  target_unit TEXT,                -- 'fasts','hours','minutes','nights','entries'
  fast_minimum_hours NUMERIC,      -- for fasting challenges: minimum length of qualifying fast
  description TEXT,
  tips TEXT[],
  badge_label TEXT,                -- '7D','16H','200H','70M', etc
  badge_color TEXT NOT NULL DEFAULT 'green', -- green, purple, pink, red
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  participants INTEGER NOT NULL DEFAULT 0,
  featured_rank INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view published challenges"
ON public.challenges FOR SELECT TO authenticated
USING (is_published = true);

CREATE POLICY "Trainers can manage challenges"
ON public.challenges FOR ALL TO authenticated
USING (public.is_trainer(auth.uid()))
WITH CHECK (public.is_trainer(auth.uid()));

CREATE TRIGGER challenges_touch_updated
BEFORE UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_challenges_type ON public.challenges(type);
CREATE INDEX idx_challenges_featured ON public.challenges(featured_rank) WHERE featured_rank IS NOT NULL;

-- =========================================
-- USER_CHALLENGES (join + progress)
-- =========================================
CREATE TABLE public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  progress_value NUMERIC NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, status)
);

ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own challenge participation"
ON public.user_challenges FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users join challenges"
ON public.user_challenges FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own participation"
ON public.user_challenges FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users abandon own participation"
ON public.user_challenges FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER user_challenges_touch_updated
BEFORE UPDATE ON public.user_challenges
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_user_challenges_user ON public.user_challenges(user_id);
CREATE INDEX idx_user_challenges_challenge ON public.user_challenges(challenge_id);
CREATE INDEX idx_user_challenges_status ON public.user_challenges(user_id, status);

-- =========================================
-- USER BOOKMARKS
-- =========================================
CREATE TABLE public.user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.explore_content(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_id)
);

ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bookmarks"
ON public.user_bookmarks FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users add own bookmarks"
ON public.user_bookmarks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own bookmarks"
ON public.user_bookmarks FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_user_bookmarks_user ON public.user_bookmarks(user_id);
CREATE INDEX idx_user_bookmarks_content ON public.user_bookmarks(content_id);
