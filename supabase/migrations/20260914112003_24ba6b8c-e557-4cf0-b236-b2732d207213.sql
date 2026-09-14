REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  email,
  full_name,
  avatar_url,
  updated_at,
  onboarding_completed,
  engine_mode,
  onboarding_answers,
  zapier_webhook_url,
  trainerize_user_id
) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS "Authenticated users can upload sport profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own sport profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own sport profile photos" ON storage.objects;

CREATE POLICY "Users upload own sport profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sport-profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users update own sport profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sport-profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'sport-profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users delete own sport profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'sport-profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);