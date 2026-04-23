ALTER TABLE public.portal_scenes ADD COLUMN IF NOT EXISTS cloudflare_video_id text;
ALTER TABLE public.breathing_exercise_videos ADD COLUMN IF NOT EXISTS cloudflare_video_id text;
CREATE INDEX IF NOT EXISTS idx_portal_scenes_cf_id ON public.portal_scenes(cloudflare_video_id) WHERE cloudflare_video_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_breathing_exercise_videos_cf_id ON public.breathing_exercise_videos(cloudflare_video_id) WHERE cloudflare_video_id IS NOT NULL;