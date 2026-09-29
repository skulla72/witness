-- Beta gate is off: any signed-in member counts as active.
CREATE OR REPLACE FUNCTION public.is_active_beta_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $$ SELECT _user_id IS NOT NULL $$;

-- Agreement check that does not break when the agreement text is revised.
CREATE OR REPLACE FUNCTION private.has_agreement(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.covenant_agreements c
    WHERE c.user_id = _user_id AND c.scope = 'app' AND c.scope_ref = 'app'
  )
$$;
REVOKE ALL ON FUNCTION private.has_agreement(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_agreement(uuid) TO authenticated, service_role;

DROP POLICY "Members read allowed prayers" ON public.prayer_posts;
CREATE POLICY "Members read allowed prayers" ON public.prayer_posts FOR SELECT TO authenticated
USING (
  public.is_active_beta_member(auth.uid())
  AND private.has_agreement(auth.uid())
  AND status <> 'removed'
  AND NOT EXISTS (
    SELECT 1 FROM public.member_blocks b
    WHERE (b.blocker_id = auth.uid() AND b.blocked_id = prayer_posts.author_id)
       OR (b.blocker_id = prayer_posts.author_id AND b.blocked_id = auth.uid())
  )
  AND (
    author_id = auth.uid()
    OR privacy = 'public'
    OR (privacy = 'church' AND organization_id IS NOT NULL AND private.is_org_member(organization_id, auth.uid()))
    OR (privacy = 'circle' AND EXISTS (
      SELECT 1 FROM public.group_members gm_self
      JOIN public.group_members gm_author ON gm_author.group_id = gm_self.group_id
      WHERE gm_self.user_id = auth.uid() AND gm_author.user_id = prayer_posts.author_id
    ))
  )
);

DROP POLICY "Members read allowed prayer media" ON public.prayer_media;
CREATE POLICY "Members read allowed prayer media" ON public.prayer_media FOR SELECT TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.prayer_posts p
    WHERE p.id = prayer_media.prayer_id
      AND public.is_active_beta_member(auth.uid())
      AND private.has_agreement(auth.uid())
      AND p.status <> 'removed'
      AND NOT EXISTS (
        SELECT 1 FROM public.member_blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.author_id)
           OR (b.blocker_id = p.author_id AND b.blocked_id = auth.uid())
      )
      AND (
        p.author_id = auth.uid()
        OR p.privacy = 'public'
        OR (p.privacy = 'church' AND p.organization_id IS NOT NULL AND private.is_org_member(p.organization_id, auth.uid()))
        OR (p.privacy = 'circle' AND EXISTS (
          SELECT 1 FROM public.group_members gm_self
          JOIN public.group_members gm_author ON gm_author.group_id = gm_self.group_id
          WHERE gm_self.user_id = auth.uid() AND gm_author.user_id = p.author_id
        ))
      )
  )
);

DROP POLICY "Members read allowed gratitude" ON public.gratitude_entries;
CREATE POLICY "Members read allowed gratitude" ON public.gratitude_entries FOR SELECT TO authenticated
USING (
  author_id = auth.uid()
  OR (privacy = 'community' AND public.is_active_beta_member(auth.uid()) AND private.has_agreement(auth.uid()))
);