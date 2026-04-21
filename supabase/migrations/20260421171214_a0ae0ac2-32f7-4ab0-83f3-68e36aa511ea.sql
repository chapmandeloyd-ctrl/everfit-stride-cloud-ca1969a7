
-- Audit log of push subscriptions auto-removed because the endpoint returned
-- 404/410 (expired). Lets the trainer dashboard surface "silent failure"
-- clients where reminders intended to land somewhere actually went to a dead
-- endpoint, so they can prompt the client to re-enable push.
CREATE TABLE public.push_subscription_removals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint_host text,
  user_agent text,
  reason text NOT NULL CHECK (reason IN ('expired_404', 'expired_410', 'expired_other')),
  removed_by text NOT NULL,
  removed_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_psr_user_unresolved
  ON public.push_subscription_removals (user_id, removed_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX idx_psr_recent
  ON public.push_subscription_removals (removed_at DESC);

ALTER TABLE public.push_subscription_removals ENABLE ROW LEVEL SECURITY;

-- Trainers can read removals for any of their clients.
CREATE POLICY "Trainers read removals for their clients"
ON public.push_subscription_removals
FOR SELECT
TO authenticated
USING (
  public.is_trainer_of_client(auth.uid(), user_id)
);

-- Clients can read their own removal history (used by client-side status card
-- to show "we noticed your subscription expired" hint).
CREATE POLICY "Users read own removals"
ON public.push_subscription_removals
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Writes are exclusively performed by edge functions running with the service
-- role key, so no INSERT/UPDATE/DELETE policies for authenticated users.

-- Trigger: when a new push_subscriptions row appears for a user, mark all of
-- their unresolved removals as resolved. Self-cleaning banner.
CREATE OR REPLACE FUNCTION public.resolve_push_removals_on_resubscribe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.push_subscription_removals
  SET resolved_at = now()
  WHERE user_id = NEW.user_id
    AND resolved_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolve_push_removals_on_resubscribe ON public.push_subscriptions;
CREATE TRIGGER trg_resolve_push_removals_on_resubscribe
AFTER INSERT ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.resolve_push_removals_on_resubscribe();
