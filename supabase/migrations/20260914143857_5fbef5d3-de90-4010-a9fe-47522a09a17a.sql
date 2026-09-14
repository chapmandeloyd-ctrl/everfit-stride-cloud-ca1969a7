DROP POLICY IF EXISTS "Task participants can view task attachments" ON storage.objects;

CREATE POLICY "Task participants can view exact task attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.client_tasks ct
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ct.attachments, '[]'::jsonb)) attachment
      WHERE (ct.client_id = auth.uid() OR ct.trainer_id = auth.uid())
        AND attachment->>'url' = name
    )
    OR EXISTS (
      SELECT 1
      FROM public.task_comments tc
      JOIN public.client_tasks ct ON ct.id = tc.task_id
      WHERE (ct.client_id = auth.uid() OR ct.trainer_id = auth.uid())
        AND tc.attachment_url = name
    )
  )
);