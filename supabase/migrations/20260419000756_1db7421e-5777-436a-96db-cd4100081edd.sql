CREATE TABLE public.breathing_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '🌬️',
  animation text NOT NULL DEFAULT 'ocean',
  phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  tone jsonb NOT NULL DEFAULT '{"hueBase":215,"hueSat":50,"warmth":0.15,"luminanceSpeed":0.95}'::jsonb,
  motion jsonb NOT NULL DEFAULT '{"motionType":"horizon-drift","luminanceAmplitude":0.04,"particleDensity":1.2,"particleSpeedMul":0.7,"particleDriftMul":1.8,"sweepAngle":0,"hueSpread":30,"arcMode":"downshift"}'::jsonb,
  music_prompt text NOT NULL DEFAULT '',
  default_track_id uuid REFERENCES public.breathing_music_tracks(id) ON DELETE SET NULL,
  hero_image_url text,
  order_index int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, slug)
);

CREATE INDEX idx_breathing_exercises_trainer ON public.breathing_exercises(trainer_id, order_index);

ALTER TABLE public.breathing_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage their own breathing exercises"
ON public.breathing_exercises
FOR ALL
USING (trainer_id = auth.uid())
WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Clients view their trainer's active breathing exercises"
ON public.breathing_exercises
FOR SELECT
USING (
  is_active = true
  AND public.is_trainer_of_client(trainer_id, auth.uid())
);

CREATE TRIGGER trg_breathing_exercises_updated_at
BEFORE UPDATE ON public.breathing_exercises
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();