DROP POLICY IF EXISTS "Public read access for task-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Trainers can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Trainers can delete own task attachments" ON storage.objects;

CREATE POLICY "Task participants can view task attachments"
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
      WHERE (ct.client_id = auth.uid() OR ct.trainer_id = auth.uid())
        AND ct.attachments::text LIKE ('%' || name || '%')
    )
    OR EXISTS (
      SELECT 1
      FROM public.task_comments tc
      JOIN public.client_tasks ct ON ct.id = tc.task_id
      WHERE (ct.client_id = auth.uid() OR ct.trainer_id = auth.uid())
        AND tc.attachment_url LIKE ('%' || name || '%')
    )
  )
);

CREATE POLICY "Users can upload own task attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND owner_id = auth.uid()::text
);

CREATE POLICY "Users can delete own task attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND owner_id = auth.uid()::text
);