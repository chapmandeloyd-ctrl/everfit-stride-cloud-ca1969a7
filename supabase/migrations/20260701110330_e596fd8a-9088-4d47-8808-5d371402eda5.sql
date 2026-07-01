-- Log table to prevent duplicate keto phase notifications
CREATE TABLE public.keto_phase_notifications_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('adjustment', 'maintenance')),
  notified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, phase)
);

GRANT SELECT ON public.keto_phase_notifications_log TO authenticated;
GRANT ALL ON public.keto_phase_notifications_log TO service_role;

ALTER TABLE public.keto_phase_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view keto phase notification log"
ON public.keto_phase_notifications_log
FOR SELECT
TO authenticated
USING (public.is_trainer(auth.uid()));

CREATE INDEX idx_keto_phase_notif_log_client ON public.keto_phase_notifications_log(client_id);
CREATE INDEX idx_keto_phase_notif_log_assignment ON public.keto_phase_notifications_log(assignment_id);
