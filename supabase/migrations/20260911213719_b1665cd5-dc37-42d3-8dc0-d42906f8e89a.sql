-- 1. Organization contact details: signed-in only (column-level)
REVOKE SELECT ON public.organizations FROM anon;
GRANT SELECT (id, owner_id, slug, name, kind, city, region, description, logo_url, website, verified, created_at, updated_at)
  ON public.organizations TO anon;
GRANT SELECT ON public.organizations TO authenticated;

-- 2. prayer_media must mirror prayer_posts privacy rules
DROP POLICY IF EXISTS "Members read allowed prayer media" ON public.prayer_media;
CREATE POLICY "Members read allowed prayer media"
ON public.prayer_media
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.prayer_posts p
    WHERE p.id = prayer_media.prayer_id
      AND public.is_active_beta_member(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.covenant_agreements c
        WHERE c.user_id = auth.uid() AND c.scope = 'app' AND c.scope_ref = 'app' AND c.version = '2026-09-2'
      )
      AND p.status <> 'removed'
      AND NOT EXISTS (
        SELECT 1 FROM public.member_blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.author_id)
           OR (b.blocker_id = p.author_id AND b.blocked_id = auth.uid())
      )
      AND (
        p.author_id = auth.uid()
        OR p.privacy = 'public'
        OR (p.privacy = 'church' AND p.organization_id IS NOT NULL AND public.is_org_member(p.organization_id, auth.uid()))
        OR (p.privacy = 'circle' AND EXISTS (
          SELECT 1 FROM public.group_members gm_self
          JOIN public.group_members gm_author ON gm_author.group_id = gm_self.group_id
          WHERE gm_self.user_id = auth.uid() AND gm_author.user_id = p.author_id
        ))
      )
  )
);

-- 3. SECURITY DEFINER helpers: only answer about the caller
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL
     AND (auth.uid() IS NULL OR _user_id = auth.uid())
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL
     AND (auth.uid() IS NULL OR _user_id = auth.uid())
     AND EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = _org_id AND m.user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL
     AND (auth.uid() IS NULL OR _user_id = auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.conversation_members
       WHERE conversation_id = _conversation_id AND user_id = _user_id
     )
$$;

-- Trigger-only helpers need no caller access at all
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_owner_as_member() FROM PUBLIC, anon, authenticated;
