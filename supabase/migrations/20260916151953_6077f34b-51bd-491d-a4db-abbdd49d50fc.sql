-- 1. Organizations: hide contact details from anonymous visitors (column-level)
REVOKE SELECT ON public.organizations FROM anon;
GRANT SELECT (id, owner_id, slug, name, kind, city, region, description, logo_url, website, verified, created_at, updated_at)
  ON public.organizations TO anon;

-- 2. Beta membership must be real
INSERT INTO public.beta_access (user_id, status)
SELECT u.id, 'active' FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_active_beta_member(_user_id uuid)
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

-- 3. Prayer visibility helper (private schema, not exposed via the API)
CREATE OR REPLACE FUNCTION private.can_view_prayer(_prayer_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.prayer_posts p
    WHERE p.id = _prayer_id
      AND p.status <> 'removed'
      AND (
        p.author_id = _user_id
        OR p.privacy = 'public'
        OR (p.privacy = 'church' AND p.organization_id IS NOT NULL AND private.is_org_member(p.organization_id, _user_id))
        OR (p.privacy = 'circle' AND EXISTS (
              SELECT 1 FROM public.group_members gm_self
              JOIN public.group_members gm_author ON gm_author.group_id = gm_self.group_id
              WHERE gm_self.user_id = _user_id AND gm_author.user_id = p.author_id
            ))
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.member_blocks b
        WHERE (b.blocker_id = _user_id AND b.blocked_id = p.author_id)
           OR (b.blocker_id = p.author_id AND b.blocked_id = _user_id)
      )
  )
$$;

GRANT EXECUTE ON FUNCTION private.can_view_prayer(uuid, uuid) TO authenticated;

-- 4. need_stories follow the need's real visibility
DROP POLICY IF EXISTS "Stories follow the need's visibility" ON public.need_stories;
CREATE POLICY "Stories follow the need's visibility"
ON public.need_stories FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.needs n
  WHERE n.id = need_stories.need_id
    AND (
      (n.is_public = true AND n.status <> 'closed')
      OR n.posted_by = auth.uid()
      OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
));

-- 5. story_shoots follow through to the need
DROP POLICY IF EXISTS "Shoots follow the story's visibility" ON public.story_shoots;
CREATE POLICY "Shoots follow the story's visibility"
ON public.story_shoots FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.need_stories s
  JOIN public.needs n ON n.id = s.need_id
  WHERE s.id = story_shoots.story_id
    AND (
      (n.is_public = true AND n.status <> 'closed')
      OR n.posted_by = auth.uid()
      OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
));

-- 6. need_updates respect linked prayer privacy
DROP POLICY IF EXISTS "Members see updates on needs they can see" ON public.need_updates;
CREATE POLICY "Members see updates on needs they can see"
ON public.need_updates FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.needs n
  WHERE n.id = need_updates.need_id
    AND (
      (n.is_public = true AND n.status <> 'closed')
      OR n.posted_by = auth.uid()
      OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR (n.prayer_id IS NOT NULL AND private.can_view_prayer(n.prayer_id, auth.uid()))
    )
));

-- 7. intercessions: taps/words only for people who can see the prayer
DROP POLICY IF EXISTS "Encouragement words visible with the prayer" ON public.intercessions;
CREATE POLICY "Encouragement words visible with the prayer"
ON public.intercessions FOR SELECT TO authenticated
USING (
  kind = ANY (ARRAY['tap'::text, 'word'::text])
  AND private.can_view_prayer(intercessions.prayer_id, auth.uid())
);