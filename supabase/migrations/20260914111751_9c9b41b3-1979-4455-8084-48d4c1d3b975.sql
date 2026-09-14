CREATE OR REPLACE FUNCTION public.prevent_untrusted_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND jwt_role <> 'service_role' THEN
    RAISE EXCEPTION 'Account role changes require an approved administrator action';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_untrusted_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_untrusted_profile_role_change
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_untrusted_profile_role_change();

REVOKE ALL ON FUNCTION public.prevent_untrusted_profile_role_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_untrusted_profile_role_change() TO service_role;