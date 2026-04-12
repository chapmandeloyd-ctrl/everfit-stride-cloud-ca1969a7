-- Allow clients to create and manage their own WOD workout plans
CREATE POLICY "Clients can manage their own WOD plans"
ON public.workout_plans
FOR ALL
TO authenticated
USING (trainer_id = auth.uid())
WITH CHECK (trainer_id = auth.uid());

-- Allow clients to manage sections in their own WOD plans
CREATE POLICY "Clients can manage sections in own WOD plans"
ON public.workout_sections
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM workout_plans wp
  WHERE wp.id = workout_sections.workout_plan_id
  AND wp.trainer_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM workout_plans wp
  WHERE wp.id = workout_sections.workout_plan_id
  AND wp.trainer_id = auth.uid()
));

-- Allow clients to manage exercises in their own WOD plans
CREATE POLICY "Clients can manage exercises in own WOD plans"
ON public.workout_plan_exercises
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM workout_plans wp
  WHERE wp.id = workout_plan_exercises.workout_plan_id
  AND wp.trainer_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM workout_plans wp
  WHERE wp.id = workout_plan_exercises.workout_plan_id
  AND wp.trainer_id = auth.uid()
));