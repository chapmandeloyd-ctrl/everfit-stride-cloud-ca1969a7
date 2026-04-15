
-- Ensure the bucket is marked public
UPDATE storage.buckets SET public = true WHERE id = 'task-attachments';

-- Add public SELECT policy if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public read access for task-attachments'
  ) THEN
    CREATE POLICY "Public read access for task-attachments"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'task-attachments');
  END IF;
END $$;
