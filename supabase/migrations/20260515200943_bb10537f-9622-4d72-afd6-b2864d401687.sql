
-- Trigger on UPDATE of auth.users to keep profiles.is_guest in sync
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_is_guest boolean;
begin
  v_is_guest := coalesce(new.is_anonymous, new.email is null or new.email = '');
  update public.profiles
    set is_guest = v_is_guest
    where user_id = new.id;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_updated();

-- Backfill existing rows
UPDATE public.profiles p
SET is_guest = coalesce(u.is_anonymous, u.email is null or u.email = '')
FROM auth.users u
WHERE p.user_id = u.id;
