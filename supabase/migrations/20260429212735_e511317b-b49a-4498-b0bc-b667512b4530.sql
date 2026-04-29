-- Allow trainers to write/manage their clients' daily journal entries
CREATE POLICY "Trainers insert client journal"
ON public.daily_journal_entries
FOR INSERT
TO authenticated
WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainers update client journal"
ON public.daily_journal_entries
FOR UPDATE
TO authenticated
USING (public.is_trainer_of_client(auth.uid(), client_id))
WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainers delete client journal"
ON public.daily_journal_entries
FOR DELETE
TO authenticated
USING (public.is_trainer_of_client(auth.uid(), client_id));