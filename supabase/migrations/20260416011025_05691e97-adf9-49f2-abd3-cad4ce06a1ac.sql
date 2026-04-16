CREATE POLICY "Clients can delete own tasks"
ON public.client_tasks
FOR DELETE
USING (auth.uid() = client_id);