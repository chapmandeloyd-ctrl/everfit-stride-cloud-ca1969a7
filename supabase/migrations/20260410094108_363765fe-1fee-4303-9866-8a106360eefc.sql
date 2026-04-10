
-- Notification templates table
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  body_html TEXT,
  body_json JSONB DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'general',
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'in_app', 'both')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their own templates"
  ON public.notification_templates FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification sends table (each send action)
CREATE TABLE public.notification_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'in_app', 'both')),
  recipient_type TEXT NOT NULL DEFAULT 'individual' CHECK (recipient_type IN ('individual', 'all', 'group')),
  recipient_filter JSONB,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their own sends"
  ON public.notification_sends FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE TRIGGER update_notification_sends_updated_at
  BEFORE UPDATE ON public.notification_sends
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Individual recipient tracking per send
CREATE TABLE public.notification_send_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  send_id UUID NOT NULL REFERENCES public.notification_sends(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'in_app')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'suppressed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_send_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their send recipients"
  ON public.notification_send_recipients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.notification_sends ns
    WHERE ns.id = send_id AND ns.trainer_id = auth.uid()
  ));

CREATE POLICY "Trainers can insert send recipients"
  ON public.notification_send_recipients FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.notification_sends ns
    WHERE ns.id = send_id AND ns.trainer_id = auth.uid()
  ));

CREATE INDEX idx_notification_send_recipients_send_id ON public.notification_send_recipients(send_id);
CREATE INDEX idx_notification_send_recipients_client_id ON public.notification_send_recipients(client_id);

-- In-app notifications for clients
CREATE TABLE public.in_app_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  send_id UUID REFERENCES public.notification_sends(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own in-app notifications"
  ON public.in_app_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark their notifications as read"
  ON public.in_app_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Trainers can insert in-app notifications"
  ON public.in_app_notifications FOR INSERT
  WITH CHECK (public.is_trainer(auth.uid()));

CREATE INDEX idx_in_app_notifications_user_id ON public.in_app_notifications(user_id);
CREATE INDEX idx_in_app_notifications_unread ON public.in_app_notifications(user_id) WHERE read_at IS NULL;

-- Enable realtime for in-app notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;
