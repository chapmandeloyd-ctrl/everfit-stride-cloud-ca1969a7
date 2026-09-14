-- Restore client self-award for badges (kept as a known low-risk warning;
-- removing it would break the gamification badge system which awards from the app)
DROP POLICY IF EXISTS "System can insert badges for clients" ON public.client_badges;
CREATE POLICY "System can insert badges for clients" ON public.client_badges
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL
    OR auth.uid() = client_id
    OR public.is_trainer_of_client(auth.uid(), client_id)
  );