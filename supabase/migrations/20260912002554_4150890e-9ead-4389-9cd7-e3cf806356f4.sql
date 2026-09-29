-- 1) Break the self-referential group roster policy with a security-definer helper
CREATE OR REPLACE FUNCTION private.shares_group(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = _group_id AND gm.user_id = _user_id
  );
$$;
REVOKE ALL ON FUNCTION private.shares_group(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.shares_group(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Group members see their own group roster" ON public.group_members;
CREATE POLICY "Group members see their own group roster" ON public.group_members
  FOR SELECT TO authenticated
  USING (private.shares_group(group_id, auth.uid()));

-- 2) has_role must be callable from RLS as the signed-in user; guard it to the caller only
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
    AND _user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    );
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;