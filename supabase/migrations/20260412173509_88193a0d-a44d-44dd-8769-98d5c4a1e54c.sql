
CREATE TABLE public.saved_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (client_id, workout_plan_id)
);

ALTER TABLE public.saved_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved workouts"
  ON public.saved_workouts FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Users can save their own workouts"
  ON public.saved_workouts FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can unsave their own workouts"
  ON public.saved_workouts FOR DELETE
  USING (auth.uid() = client_id);

CREATE INDEX idx_saved_workouts_client ON public.saved_workouts(client_id);
