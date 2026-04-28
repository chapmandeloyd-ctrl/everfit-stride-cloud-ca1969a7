-- Track early-end events for fasts and eating windows
CREATE TABLE public.early_session_ends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('fast', 'eating_window')),
  elapsed_hours NUMERIC(6,2) NOT NULL,
  target_hours NUMERIC(6,2) NOT NULL,
  percent_complete NUMERIC(5,2) NOT NULL,
  reason TEXT,
  action_attempted TEXT,
  ai_suggestion_shown BOOLEAN NOT NULL DEFAULT false,
  ai_suggestion_text TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_early_session_ends_client ON public.early_session_ends(client_id, created_at DESC);
CREATE INDEX idx_early_session_ends_type ON public.early_session_ends(session_type);

ALTER TABLE public.early_session_ends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view their own early-end records"
  ON public.early_session_ends FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients insert their own early-end records"
  ON public.early_session_ends FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients delete their own early-end records"
  ON public.early_session_ends FOR DELETE
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers view their clients early-end records"
  ON public.early_session_ends FOR SELECT
  USING (public.is_trainer_of_client(auth.uid(), client_id));