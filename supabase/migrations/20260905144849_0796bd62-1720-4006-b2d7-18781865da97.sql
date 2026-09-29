CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = _org_id AND m.user_id = _user_id)
$$;

-- organization_members: only your own rows, fellow members of the same org, or admins
DROP POLICY IF EXISTS "Members are viewable by signed-in people" ON public.organization_members;
CREATE POLICY "Members are viewable by same-org people"
ON public.organization_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_org_member(org_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- group_members: only your own rows, people in the same organization, or admins
DROP POLICY IF EXISTS "Group members are viewable by signed-in people" ON public.group_members;
CREATE POLICY "Group members are viewable by same-org people"
ON public.group_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.organization_groups g
    WHERE g.id = group_members.group_id AND public.is_org_member(g.org_id, auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- profiles: signed-in people only, not the anonymous public
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by signed-in people"
ON public.profiles FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.profiles FROM anon;

-- organizations: contact email/phone only for signed-in people
REVOKE SELECT ON public.organizations FROM anon;
GRANT SELECT (
  id, owner_id, slug, name, kind, city, region, description, logo_url, website,
  verified, address, created_at, updated_at
) ON public.organizations TO anon;