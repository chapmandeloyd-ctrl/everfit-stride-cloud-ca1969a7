-- Admin data console: function to list public tables for trainers
CREATE OR REPLACE FUNCTION public.admin_list_tables()
RETURNS TABLE(table_name text, row_estimate bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_trainer(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT c.relname::text AS table_name,
         c.reltuples::bigint AS row_estimate
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY c.relname;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_tables() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_tables() TO authenticated;