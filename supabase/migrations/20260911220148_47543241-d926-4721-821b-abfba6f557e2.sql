-- 1. Auto-create profile + access on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
DROP FUNCTION IF EXISTS public.ensure_member();

-- 2. Moderator check lives in the private schema (policy-only)
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.is_moderator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
     AND (auth.uid() IS NULL OR _user_id = auth.uid())
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','vetter'))
$$;
REVOKE ALL ON FUNCTION private.is_moderator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_moderator(uuid) TO authenticated;

DROP POLICY IF EXISTS "Moderators read all prayers" ON public.prayer_posts;
DROP POLICY IF EXISTS "Moderators update prayers" ON public.prayer_posts;
DROP POLICY IF EXISTS "Moderators read all prayer media" ON public.prayer_media;
DROP POLICY IF EXISTS "Moderators read all gratitude" ON public.gratitude_entries;
DROP POLICY IF EXISTS "Moderators delete gratitude" ON public.gratitude_entries;
DROP POLICY IF EXISTS "Moderators read reported messages" ON public.messages;
DROP POLICY IF EXISTS "Moderators read all groups" ON public.organization_groups;
DROP POLICY IF EXISTS "Moderators read all intercessions" ON public.intercessions;
DROP POLICY IF EXISTS "Moderators delete intercessions" ON public.intercessions;
DROP FUNCTION IF EXISTS public.is_moderator(uuid);

CREATE POLICY "Moderators read all prayers" ON public.prayer_posts FOR SELECT TO authenticated
  USING (private.is_moderator(auth.uid()));
CREATE POLICY "Moderators update prayers" ON public.prayer_posts FOR UPDATE TO authenticated
  USING (private.is_moderator(auth.uid())) WITH CHECK (private.is_moderator(auth.uid()));
CREATE POLICY "Moderators read all prayer media" ON public.prayer_media FOR SELECT TO authenticated
  USING (private.is_moderator(auth.uid()));
CREATE POLICY "Moderators read all gratitude" ON public.gratitude_entries FOR SELECT TO authenticated
  USING (private.is_moderator(auth.uid()));
CREATE POLICY "Moderators delete gratitude" ON public.gratitude_entries FOR DELETE TO authenticated
  USING (private.is_moderator(auth.uid()));
CREATE POLICY "Moderators read reported messages" ON public.messages FOR SELECT TO authenticated
  USING (private.is_moderator(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.content_reports r WHERE r.target_type = 'message' AND r.target_id = messages.id));
CREATE POLICY "Moderators read all groups" ON public.organization_groups FOR SELECT TO authenticated
  USING (private.is_moderator(auth.uid()));
CREATE POLICY "Moderators read all intercessions" ON public.intercessions FOR SELECT TO authenticated
  USING (private.is_moderator(auth.uid()));
CREATE POLICY "Moderators delete intercessions" ON public.intercessions FOR DELETE TO authenticated
  USING (private.is_moderator(auth.uid()));

-- 3. Stored member counts instead of callable count helpers
DROP FUNCTION IF EXISTS public.prayer_intercession_counts(uuid[]);
DROP FUNCTION IF EXISTS public.group_member_counts(uuid[]);

ALTER TABLE public.organization_groups ADD COLUMN IF NOT EXISTS member_count integer NOT NULL DEFAULT 0;
UPDATE public.organization_groups g SET member_count = (SELECT count(*) FROM public.group_members gm WHERE gm.group_id = g.id);

CREATE OR REPLACE FUNCTION public.sync_group_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.organization_groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.organization_groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_group_member_count() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS group_members_count ON public.group_members;
CREATE TRIGGER group_members_count AFTER INSERT OR DELETE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_group_member_count();