CREATE TABLE public.protocol_assignment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  protocol_id UUID REFERENCES public.fasting_protocols(id) ON DELETE SET NULL,
  protocol_name TEXT,
  previous_protocol_id UUID REFERENCES public.fasting_protocols(id) ON DELETE SET NULL,
  previous_protocol_name TEXT,
  source TEXT NOT NULL DEFAULT 'assign',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_protocol_history_client ON public.protocol_assignment_history(client_id, created_at DESC);

GRANT SELECT, INSERT ON public.protocol_assignment_history TO authenticated;
GRANT ALL ON public.protocol_assignment_history TO service_role;

ALTER TABLE public.protocol_assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client can view their own protocol history"
ON public.protocol_assignment_history
FOR SELECT TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Trainer can view their client's protocol history"
ON public.protocol_assignment_history
FOR SELECT TO authenticated
USING (public.is_trainer_of_client(auth.uid(), client_id));

CREATE POLICY "Trainer can insert protocol history for their client"
ON public.protocol_assignment_history
FOR INSERT TO authenticated
WITH CHECK (
  assigned_by = auth.uid()
  AND (client_id = auth.uid() OR public.is_trainer_of_client(auth.uid(), client_id))
);