
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS enforce_scheduled_start BOOLEAN NOT NULL DEFAULT FALSE;

-- Prune orphan rows that reference users no longer in profiles/auth.users.
-- These cause repeated foreign-key errors on in_app_notifications inserts.
DELETE FROM public.client_habits h
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = h.client_id);

DELETE FROM public.client_feature_settings s
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.client_id);

DELETE FROM public.fitness_goals g
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = g.client_id);
