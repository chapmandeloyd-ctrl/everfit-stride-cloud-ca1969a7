ALTER TABLE public.in_app_notifications
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reference_id TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_type ON public.in_app_notifications(type);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_reference_id ON public.in_app_notifications(reference_id);