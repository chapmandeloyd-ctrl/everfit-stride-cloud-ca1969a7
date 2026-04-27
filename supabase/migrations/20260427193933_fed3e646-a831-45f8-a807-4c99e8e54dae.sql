CREATE POLICY "Trainers insert assigned client habit loop prefs"
  ON public.habit_loop_preferences
  FOR INSERT
  WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainers update assigned client habit loop prefs"
  ON public.habit_loop_preferences
  FOR UPDATE
  USING (public.is_trainer_of_client(auth.uid(), client_id))
  WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));