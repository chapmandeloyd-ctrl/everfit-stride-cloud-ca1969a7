-- 1) Profiles: explicit WITH CHECK + authenticated-only, role immutability enforced on every update
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- enforce role immutability on ANY update (not just when the role column is listed)
DROP TRIGGER IF EXISTS prevent_untrusted_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_untrusted_profile_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_untrusted_profile_role_change();

-- 2) trainer_clients: no self-assignment, trainer verification required
DROP POLICY IF EXISTS "Trainers can insert their clients" ON public.trainer_clients;
CREATE POLICY "Trainers can insert their clients"
ON public.trainer_clients FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = trainer_id
  AND client_id <> auth.uid()
  AND public.is_trainer(auth.uid())
);

DROP POLICY IF EXISTS "Trainers can update their clients" ON public.trainer_clients;
CREATE POLICY "Trainers can update their clients"
ON public.trainer_clients FOR UPDATE
TO authenticated
USING (auth.uid() = trainer_id AND public.is_trainer(auth.uid()))
WITH CHECK (
  auth.uid() = trainer_id
  AND client_id <> auth.uid()
  AND public.is_trainer(auth.uid())
);

DROP POLICY IF EXISTS "Trainers can view their clients" ON public.trainer_clients;
CREATE POLICY "Trainers can view their clients"
ON public.trainer_clients FOR SELECT
TO authenticated
USING (auth.uid() = trainer_id OR auth.uid() = client_id);