CREATE OR REPLACE FUNCTION public.protect_coach_controlled_client_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() = OLD.trainer_id THEN
    RETURN NEW;
  END IF;

  IF auth.uid() <> OLD.client_id THEN
    RAISE EXCEPTION 'Not authorized to update these settings' USING ERRCODE = '42501';
  END IF;

  IF NEW.trainer_id IS DISTINCT FROM OLD.trainer_id
     OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.is_premium IS DISTINCT FROM OLD.is_premium
     OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.engine_mode IS DISTINCT FROM OLD.engine_mode
     OR NEW.ai_suggestions_enabled IS DISTINCT FROM OLD.ai_suggestions_enabled
     OR NEW.auto_level_advance_enabled IS DISTINCT FROM OLD.auto_level_advance_enabled
     OR NEW.auto_plan_adjust_enabled IS DISTINCT FROM OLD.auto_plan_adjust_enabled
     OR NEW.auto_nudge_optimization_enabled IS DISTINCT FROM OLD.auto_nudge_optimization_enabled
     OR NEW.lock_advanced_plans IS DISTINCT FROM OLD.lock_advanced_plans
     OR NEW.athletic_safety_lock IS DISTINCT FROM OLD.athletic_safety_lock
     OR NEW.require_coach_approval_plans IS DISTINCT FROM OLD.require_coach_approval_plans
     OR NEW.fast_lock_pin IS DISTINCT FROM OLD.fast_lock_pin
     OR NEW.client_can_edit_goal IS DISTINCT FROM OLD.client_can_edit_goal
     OR NEW.lock_start_weight_after_set IS DISTINCT FROM OLD.lock_start_weight_after_set
     OR NEW.allow_plan_suggestions IS DISTINCT FROM OLD.allow_plan_suggestions
     OR NEW.allow_level_auto_advance IS DISTINCT FROM OLD.allow_level_auto_advance
     OR NEW.auto_advance_levels IS DISTINCT FROM OLD.auto_advance_levels
  THEN
    RAISE EXCEPTION 'Coach-controlled settings cannot be changed by clients' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_coach_controlled_client_settings_trigger ON public.client_feature_settings;
CREATE TRIGGER protect_coach_controlled_client_settings_trigger
BEFORE UPDATE ON public.client_feature_settings
FOR EACH ROW
EXECUTE FUNCTION public.protect_coach_controlled_client_settings();

DROP POLICY IF EXISTS "Clients can update their own feature settings" ON public.client_feature_settings;
CREATE POLICY "Clients can update safe personal settings"
ON public.client_feature_settings
FOR UPDATE
TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid() AND trainer_id = trainer_id);