-- Create coaching_messages table
CREATE TABLE public.coaching_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_type TEXT NOT NULL,
  message TEXT NOT NULL,
  action_text TEXT,
  priority INTEGER NOT NULL DEFAULT 5,
  delivery_slot TEXT NOT NULL DEFAULT 'morning',
  is_read BOOLEAN NOT NULL DEFAULT false,
  message_date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_score NUMERIC,
  macro_adherence NUMERIC,
  fasting_adherence NUMERIC,
  streak INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_coaching_messages_client_date ON public.coaching_messages(client_id, message_date DESC);

-- Enable RLS
ALTER TABLE public.coaching_messages ENABLE ROW LEVEL SECURITY;

-- Clients can read their own messages
CREATE POLICY "Clients can view own coaching messages"
  ON public.coaching_messages FOR SELECT
  USING (auth.uid() = client_id);

-- Clients can mark messages as read
CREATE POLICY "Clients can update own coaching messages"
  ON public.coaching_messages FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Trainers can view their clients' messages
CREATE POLICY "Trainers can view client coaching messages"
  ON public.coaching_messages FOR SELECT
  USING (
    public.is_trainer(auth.uid()) AND
    public.is_trainer_of_client(auth.uid(), client_id)
  );

-- Service role insert (edge functions)
CREATE POLICY "Service role can insert coaching messages"
  ON public.coaching_messages FOR INSERT
  WITH CHECK (true);

-- Timestamp trigger
CREATE TRIGGER update_coaching_messages_updated_at
  BEFORE UPDATE ON public.coaching_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.coaching_messages;