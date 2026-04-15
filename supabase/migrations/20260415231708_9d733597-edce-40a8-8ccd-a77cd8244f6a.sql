
-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view task attachments
CREATE POLICY "Authenticated users can view task attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-attachments');

-- Allow trainers to upload task attachments to their folder
CREATE POLICY "Trainers can upload task attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow trainers to delete their own task attachments
CREATE POLICY "Trainers can delete own task attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
