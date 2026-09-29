CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL
     AND (auth.uid() IS NULL OR _user_id = auth.uid())
     AND EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = _org_id AND m.user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION private.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL
     AND (auth.uid() IS NULL OR _user_id = auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.conversation_members
       WHERE conversation_id = _conversation_id AND user_id = _user_id
     )
$$;

GRANT EXECUTE ON FUNCTION private.is_org_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_conversation_member(uuid, uuid) TO authenticated, service_role;

-- calls
DROP POLICY "Members read calls" ON public.calls;
CREATE POLICY "Members read calls" ON public.calls FOR SELECT TO authenticated
USING (private.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY "Members start calls" ON public.calls;
CREATE POLICY "Members start calls" ON public.calls FOR INSERT TO authenticated
WITH CHECK (auth.uid() = initiator_id AND private.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY "Members update calls" ON public.calls;
CREATE POLICY "Members update calls" ON public.calls FOR UPDATE TO authenticated
USING (private.is_conversation_member(conversation_id, auth.uid()))
WITH CHECK (private.is_conversation_member(conversation_id, auth.uid()));

-- conversation_members
DROP POLICY "Members read the roster" ON public.conversation_members;
CREATE POLICY "Members read the roster" ON public.conversation_members FOR SELECT TO authenticated
USING (private.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY "Starter adds members" ON public.conversation_members;
CREATE POLICY "Starter adds members" ON public.conversation_members FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_members.conversation_id AND c.created_by = auth.uid())
  OR private.is_conversation_member(conversation_id, auth.uid())
);

-- conversations
DROP POLICY "Members read their conversations" ON public.conversations;
CREATE POLICY "Members read their conversations" ON public.conversations FOR SELECT TO authenticated
USING (private.is_conversation_member(id, auth.uid()));
DROP POLICY "Members touch their conversations" ON public.conversations;
CREATE POLICY "Members touch their conversations" ON public.conversations FOR UPDATE TO authenticated
USING (private.is_conversation_member(id, auth.uid()))
WITH CHECK (private.is_conversation_member(id, auth.uid()));

-- messages
DROP POLICY "Members read messages" ON public.messages;
CREATE POLICY "Members read messages" ON public.messages FOR SELECT TO authenticated
USING (private.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY "Members send messages" ON public.messages;
CREATE POLICY "Members send messages" ON public.messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND private.is_conversation_member(conversation_id, auth.uid()));

-- group_members
DROP POLICY "Group members are viewable by same-org people" ON public.group_members;
CREATE POLICY "Group members are viewable by same-org people" ON public.group_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.organization_groups g WHERE g.id = group_members.group_id AND private.is_org_member(g.org_id, auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- organization_members
DROP POLICY "Members are viewable by same-org people" ON public.organization_members;
CREATE POLICY "Members are viewable by same-org people" ON public.organization_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR private.is_org_member(org_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- prayer_posts
DROP POLICY "Members read allowed prayers" ON public.prayer_posts;
CREATE POLICY "Members read allowed prayers" ON public.prayer_posts FOR SELECT TO authenticated
USING (
  public.is_active_beta_member(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.covenant_agreements c
    WHERE c.user_id = auth.uid() AND c.scope = 'app' AND c.scope_ref = 'app' AND c.version = '2026-09-2'
  )
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

-- prayer_media
DROP POLICY "Members read allowed prayer media" ON public.prayer_media;
CREATE POLICY "Members read allowed prayer media" ON public.prayer_media FOR SELECT TO authenticated
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
        OR (p.privacy = 'church' AND p.organization_id IS NOT NULL AND private.is_org_member(p.organization_id, auth.uid()))
        OR (p.privacy = 'circle' AND EXISTS (
          SELECT 1 FROM public.group_members gm_self
          JOIN public.group_members gm_author ON gm_author.group_id = gm_self.group_id
          WHERE gm_self.user_id = auth.uid() AND gm_author.user_id = p.author_id
        ))
      )
  )
);

DROP FUNCTION IF EXISTS public.is_org_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_conversation_member(uuid, uuid);
