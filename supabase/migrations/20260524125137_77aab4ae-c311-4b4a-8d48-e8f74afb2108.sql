-- 1) Fix function search_path
CREATE OR REPLACE FUNCTION public.gen_game_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..5 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 2) Revoke EXECUTE from anon (and PUBLIC) on all SECURITY DEFINER game functions.
--    Keep them callable by signed-in users.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
  END LOOP;
END $$;

-- 3) user_roles: restrict SELECT to own row + admins
DROP POLICY IF EXISTS "roles readable by all authed" ON public.user_roles;

CREATE POLICY "users read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admins read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4) Stop broadcasting private dice over Realtime.
--    Clients refresh via the 'rounds' realtime stream + a direct select scoped by RLS.
ALTER PUBLICATION supabase_realtime DROP TABLE public.round_dice;
