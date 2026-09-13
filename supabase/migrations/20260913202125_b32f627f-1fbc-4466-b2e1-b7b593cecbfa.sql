DROP POLICY IF EXISTS "Guardian can read own link by token" ON public.guardian_links;

REVOKE SELECT ON public.guardian_links FROM anon;

CREATE OR REPLACE FUNCTION public.get_guardian_link_by_token(_token text)
RETURNS TABLE(
  id uuid,
  athlete_user_id uuid,
  trainer_id uuid,
  guardian_email text,
  status text,
  coach_note text,
  created_at timestamptz,
  expires_at timestamptz,
  linked_at timestamptz,
  weekly_summary_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gl.id, gl.athlete_user_id, gl.trainer_id, gl.guardian_email, gl.status,
         gl.coach_note, gl.created_at, gl.expires_at, gl.linked_at, gl.weekly_summary_enabled
  FROM public.guardian_links gl
  WHERE gl.token = _token
    AND gl.revoked_at IS NULL
    AND (gl.expires_at IS NULL OR gl.expires_at > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_guardian_link_by_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_guardian_link_by_token(text) TO anon, authenticated, service_role;