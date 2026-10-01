CREATE OR REPLACE FUNCTION public.is_trainer_of_client(_trainer_id uuid, _client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trainer_clients tc
    JOIN public.profiles p ON p.id = tc.trainer_id
    WHERE tc.trainer_id = _trainer_id AND tc.client_id = _client_id
      AND tc.status IN ('active','pending') AND p.role = 'trainer'
  )
  OR EXISTS (
    SELECT 1 FROM public.client_feature_settings cfs
    JOIN public.profiles p ON p.id = cfs.trainer_id
    JOIN public.trainer_clients tc
      ON tc.trainer_id = cfs.trainer_id AND tc.client_id = cfs.client_id AND tc.status IN ('active','pending')
    WHERE cfs.client_id = _client_id AND cfs.trainer_id = _trainer_id AND p.role = 'trainer'
  )
$$;