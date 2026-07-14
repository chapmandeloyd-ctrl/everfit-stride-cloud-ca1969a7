ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trainerize_user_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_trainerize_user_id_key
  ON public.profiles (trainerize_user_id)
  WHERE trainerize_user_id IS NOT NULL;