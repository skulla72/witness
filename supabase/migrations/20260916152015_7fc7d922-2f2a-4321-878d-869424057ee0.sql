CREATE OR REPLACE FUNCTION private.is_active_beta_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.beta_access ba
    WHERE ba.user_id = _user_id AND ba.status = 'active'
  )
$$;

GRANT EXECUTE ON FUNCTION private.is_active_beta_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_active_beta_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.is_active_beta_member(_user_id)
$$;