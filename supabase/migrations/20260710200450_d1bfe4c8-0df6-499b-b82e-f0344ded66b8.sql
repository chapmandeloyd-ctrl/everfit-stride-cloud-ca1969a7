
CREATE OR REPLACE FUNCTION public.list_mcp_connections(_user_id uuid)
RETURNS TABLE(
  consent_id uuid,
  client_id uuid,
  client_name text,
  client_uri text,
  logo_uri text,
  scopes text,
  granted_at timestamptz,
  last_active_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT
    c.id AS consent_id,
    c.client_id,
    oc.client_name,
    oc.client_uri,
    oc.logo_uri,
    c.scopes::text,
    c.granted_at,
    (
      SELECT MAX(COALESCE(s.refreshed_at, s.created_at))
      FROM auth.sessions s
      WHERE s.user_id = _user_id AND s.oauth_client_id = c.client_id
    ) AS last_active_at
  FROM auth.oauth_consents c
  JOIN auth.oauth_clients oc ON oc.id = c.client_id
  WHERE c.user_id = _user_id
    AND c.revoked_at IS NULL
    AND oc.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.revoke_mcp_connection(_user_id uuid, _client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  UPDATE auth.oauth_consents
  SET revoked_at = now()
  WHERE user_id = _user_id AND client_id = _client_id AND revoked_at IS NULL;

  DELETE FROM auth.oauth_authorizations
  WHERE user_id = _user_id AND client_id = _client_id;

  DELETE FROM auth.sessions
  WHERE user_id = _user_id AND oauth_client_id = _client_id;
END;
$$;

REVOKE ALL ON FUNCTION public.list_mcp_connections(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.revoke_mcp_connection(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_mcp_connections(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_mcp_connection(uuid, uuid) TO service_role;
