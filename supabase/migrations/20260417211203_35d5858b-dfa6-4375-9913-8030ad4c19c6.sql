-- 1. Create portal_backgrounds table for nebula and horizon images
CREATE TABLE public.portal_backgrounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  layer TEXT NOT NULL CHECK (layer IN ('nebula', 'horizon')),
  image_url TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_backgrounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active portal backgrounds"
  ON public.portal_backgrounds FOR SELECT
  USING (is_active = true OR public.is_trainer(auth.uid()));

CREATE POLICY "Trainers can manage portal backgrounds"
  ON public.portal_backgrounds FOR ALL
  USING (public.is_trainer(auth.uid()))
  WITH CHECK (public.is_trainer(auth.uid()));

CREATE TRIGGER trg_portal_backgrounds_updated_at
  BEFORE UPDATE ON public.portal_backgrounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Per-category defaults
CREATE TABLE public.portal_category_backgrounds (
  category TEXT NOT NULL PRIMARY KEY,
  nebula_id UUID REFERENCES public.portal_backgrounds(id) ON DELETE SET NULL,
  horizon_id UUID REFERENCES public.portal_backgrounds(id) ON DELETE SET NULL,
  show_horizon BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_category_backgrounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view category backgrounds"
  ON public.portal_category_backgrounds FOR SELECT
  USING (true);

CREATE POLICY "Trainers can manage category backgrounds"
  ON public.portal_category_backgrounds FOR ALL
  USING (public.is_trainer(auth.uid()))
  WITH CHECK (public.is_trainer(auth.uid()));

CREATE TRIGGER trg_portal_category_backgrounds_updated_at
  BEFORE UPDATE ON public.portal_category_backgrounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Per-scene overrides on portal_scenes
ALTER TABLE public.portal_scenes
  ADD COLUMN IF NOT EXISTS override_nebula_id UUID REFERENCES public.portal_backgrounds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS override_horizon_id UUID REFERENCES public.portal_backgrounds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS override_show_horizon BOOLEAN;