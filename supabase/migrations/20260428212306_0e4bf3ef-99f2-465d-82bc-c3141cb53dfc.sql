-- ============================================================
-- ACTIVITY TIMELINE: append-only event log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  subtitle TEXT,
  icon TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'client',
  actor_id UUID,
  edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  edited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_client_time
  ON public.activity_events (client_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_type
  ON public.activity_events (client_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_category
  ON public.activity_events (client_id, category, occurred_at DESC);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- Clients see their own events
CREATE POLICY "Clients can view own activity events"
ON public.activity_events
FOR SELECT
USING (auth.uid() = client_id);

-- Trainers see events for their clients
CREATE POLICY "Trainers can view client activity events"
ON public.activity_events
FOR SELECT
USING (public.is_trainer_of_client(auth.uid(), client_id));

-- Clients can insert their own events
CREATE POLICY "Clients can insert own activity events"
ON public.activity_events
FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Trainers can insert events for their clients
CREATE POLICY "Trainers can insert client activity events"
ON public.activity_events
FOR INSERT
WITH CHECK (public.is_trainer_of_client(auth.uid(), client_id));

-- Trainers can update events for their clients (for edits)
CREATE POLICY "Trainers can update client activity events"
ON public.activity_events
FOR UPDATE
USING (public.is_trainer_of_client(auth.uid(), client_id));

-- Trainers can delete events for their clients
CREATE POLICY "Trainers can delete client activity events"
ON public.activity_events
FOR DELETE
USING (public.is_trainer_of_client(auth.uid(), client_id));

-- updated_at trigger
CREATE TRIGGER trg_activity_events_touch
BEFORE UPDATE ON public.activity_events
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- Edit tracking: when content fields change, mark edited
CREATE OR REPLACE FUNCTION public.mark_activity_event_edited()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.title IS DISTINCT FROM OLD.title)
     OR (NEW.subtitle IS DISTINCT FROM OLD.subtitle)
     OR (NEW.metadata IS DISTINCT FROM OLD.metadata)
     OR (NEW.occurred_at IS DISTINCT FROM OLD.occurred_at) THEN
    NEW.edited := true;
    NEW.edited_at := now();
    NEW.edited_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_events_mark_edited
BEFORE UPDATE ON public.activity_events
FOR EACH ROW
EXECUTE FUNCTION public.mark_activity_event_edited();

-- Helper function: emit_activity_event
CREATE OR REPLACE FUNCTION public.emit_activity_event(
  p_client_id UUID,
  p_event_type TEXT,
  p_title TEXT,
  p_subtitle TEXT DEFAULT NULL,
  p_category TEXT DEFAULT 'general',
  p_icon TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_source TEXT DEFAULT 'client',
  p_occurred_at TIMESTAMPTZ DEFAULT now(),
  p_actor_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.activity_events
    (client_id, event_type, title, subtitle, category, icon, metadata, source, occurred_at, actor_id)
  VALUES
    (p_client_id, p_event_type, p_title, p_subtitle, p_category, p_icon, p_metadata, p_source, p_occurred_at, COALESCE(p_actor_id, auth.uid()))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Backfill function: pulls history from existing tables for a client
CREATE OR REPLACE FUNCTION public.backfill_activity_events(p_client_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Wipe prior backfill rows so this is idempotent
  DELETE FROM public.activity_events
  WHERE client_id = p_client_id
    AND source = 'backfill';

  -- 1) Fasting log -> fast started + fast ended
  INSERT INTO public.activity_events (client_id, event_type, title, subtitle, category, icon, metadata, source, occurred_at)
  SELECT
    p_client_id,
    'fast_started',
    'Fast started',
    NULL,
    'fasting',
    'play',
    jsonb_build_object('fasting_log_id', fl.id, 'protocol', fl.protocol),
    'backfill',
    fl.start_time
  FROM public.fasting_log fl
  WHERE fl.client_id = p_client_id AND fl.start_time IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.activity_events (client_id, event_type, title, subtitle, category, icon, metadata, source, occurred_at)
  SELECT
    p_client_id,
    CASE WHEN fl.status = 'completed' THEN 'fast_completed' ELSE 'fast_ended_early' END,
    CASE WHEN fl.status = 'completed' THEN 'Fast completed' ELSE 'Fast ended early' END,
    CASE WHEN fl.duration_minutes IS NOT NULL THEN ROUND(fl.duration_minutes / 60.0, 1)::text || ' h' ELSE NULL END,
    'fasting',
    CASE WHEN fl.status = 'completed' THEN 'check-circle' ELSE 'stop-circle' END,
    jsonb_build_object('fasting_log_id', fl.id, 'duration_minutes', fl.duration_minutes, 'status', fl.status),
    'backfill',
    fl.end_time
  FROM public.fasting_log fl
  WHERE fl.client_id = p_client_id AND fl.end_time IS NOT NULL;

  -- 2) Early session ends
  INSERT INTO public.activity_events (client_id, event_type, title, subtitle, category, icon, metadata, source, occurred_at)
  SELECT
    p_client_id,
    'session_ended_early',
    'Session ended early',
    ese.reason,
    'fasting',
    'stop-circle',
    jsonb_build_object('early_end_id', ese.id, 'reason', ese.reason, 'session_type', ese.session_type),
    'backfill',
    ese.created_at
  FROM public.early_session_ends ese
  WHERE ese.client_id = p_client_id;

  -- 3) Workout sessions
  INSERT INTO public.activity_events (client_id, event_type, title, subtitle, category, icon, metadata, source, occurred_at)
  SELECT
    p_client_id,
    CASE WHEN ws.status = 'completed' THEN 'workout_completed' ELSE 'workout_started' END,
    CASE WHEN ws.status = 'completed' THEN 'Workout completed' ELSE 'Workout started' END,
    NULL,
    'workout',
    'dumbbell',
    jsonb_build_object('workout_session_id', ws.id, 'status', ws.status),
    'backfill',
    COALESCE(ws.completed_at, ws.started_at, ws.created_at)
  FROM public.workout_sessions ws
  WHERE ws.client_id = p_client_id;

  -- 4) Weigh-ins (client_metric_entries with Weight metric)
  INSERT INTO public.activity_events (client_id, event_type, title, subtitle, category, icon, metadata, source, occurred_at)
  SELECT
    p_client_id,
    'weighin_logged',
    'Weigh-in logged',
    cme.value::text || ' lbs',
    'metrics',
    'scale',
    jsonb_build_object('entry_id', cme.id, 'value', cme.value),
    'backfill',
    cme.recorded_at
  FROM public.client_metric_entries cme
  JOIN public.client_metrics cm ON cm.id = cme.client_metric_id
  JOIN public.metric_definitions md ON md.id = cm.metric_definition_id
  WHERE cme.client_id = p_client_id AND md.name = 'Weight';

  -- 5) Coach overrides
  INSERT INTO public.activity_events (client_id, event_type, title, subtitle, category, icon, metadata, source, occurred_at, actor_id)
  SELECT
    p_client_id,
    'coach_override',
    'Trainer adjustment',
    COALESCE(col.reason, col.override_type),
    'trainer',
    'edit',
    jsonb_build_object('override_id', col.id, 'override_type', col.override_type, 'old_value', col.old_value, 'new_value', col.new_value),
    'backfill',
    col.created_at,
    col.trainer_id
  FROM public.coach_override_log col
  WHERE col.client_id = p_client_id;

  RETURN (SELECT COUNT(*) FROM public.activity_events WHERE client_id = p_client_id AND source = 'backfill');
END;
$$;