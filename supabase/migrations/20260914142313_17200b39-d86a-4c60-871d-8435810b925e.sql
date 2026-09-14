DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload chat attachments" ON storage.objects;

CREATE POLICY "Conversation members can view chat attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id::text = (storage.foldername(name))[1]
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Conversation members can upload chat attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND owner_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id::text = (storage.foldername(name))[1]
      AND cm.user_id = auth.uid()
  )
);