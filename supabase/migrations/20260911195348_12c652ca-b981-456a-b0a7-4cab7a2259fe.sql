CREATE OR REPLACE FUNCTION public.is_active_beta_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.beta_access
    WHERE user_id = _user_id AND status = 'active'
  )
$$;
REVOKE ALL ON FUNCTION public.is_active_beta_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_beta_member(uuid) TO authenticated, service_role;