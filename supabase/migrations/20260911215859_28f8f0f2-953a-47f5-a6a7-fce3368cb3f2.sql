-- Prayer extras
ALTER TABLE public.prayer_posts
  ADD COLUMN IF NOT EXISTS answer_kind text CHECK (answer_kind IN ('yes','differently','still_trusting')),
  ADD COLUMN IF NOT EXISTS bg_color text;

-- Intercession kind (tap = "I'm praying", word = written encouragement, video/voice = recorded prayer)
ALTER TABLE public.intercessions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'tap' CHECK (kind IN ('tap','word','video','voice'));
CREATE INDEX IF NOT EXISTS intercessions_prayer_kind_idx ON public.intercessions (prayer_id, kind);

-- Member bootstrap (profile + community access) for the signed-in caller
CREATE OR REPLACE FUNCTION public.ensure_member()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u uuid := auth.uid();
  e text;
  meta jsonb;
BEGIN
  IF u IS NULL THEN RETURN; END IF;
  SELECT email, raw_user_meta_data INTO e, meta FROM auth.users WHERE id = u;
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (u, COALESCE(meta->>'full_name', meta->>'name', split_part(COALESCE(e, ''), '@', 1)), meta->>'avatar_url')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.beta_access (user_id, status)
  VALUES (u, 'active')
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_member() TO authenticated;

-- Moderator helper
CREATE OR REPLACE FUNCTION public.is_moderator(_user_id uuid)
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
REVOKE ALL ON FUNCTION public.is_moderator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_moderator(uuid) TO authenticated;

-- Moderator visibility + removal powers
CREATE POLICY "Moderators read all prayers" ON public.prayer_posts FOR SELECT TO authenticated
  USING (public.is_moderator(auth.uid()));
CREATE POLICY "Moderators update prayers" ON public.prayer_posts FOR UPDATE TO authenticated
  USING (public.is_moderator(auth.uid())) WITH CHECK (public.is_moderator(auth.uid()));
CREATE POLICY "Moderators read all prayer media" ON public.prayer_media FOR SELECT TO authenticated
  USING (public.is_moderator(auth.uid()));
CREATE POLICY "Moderators read all gratitude" ON public.gratitude_entries FOR SELECT TO authenticated
  USING (public.is_moderator(auth.uid()));
CREATE POLICY "Moderators delete gratitude" ON public.gratitude_entries FOR DELETE TO authenticated
  USING (public.is_moderator(auth.uid()));
CREATE POLICY "Moderators read reported messages" ON public.messages FOR SELECT TO authenticated
  USING (public.is_moderator(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.content_reports r WHERE r.target_type = 'message' AND r.target_id = messages.id));
CREATE POLICY "Moderators read all groups" ON public.organization_groups FOR SELECT TO authenticated
  USING (public.is_moderator(auth.uid()));

-- Circles: richer group shape + members can see their own group's roster
ALTER TABLE public.organization_groups
  ADD COLUMN IF NOT EXISTS tone text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'faith' CHECK (kind IN ('faith','open')),
  ADD COLUMN IF NOT EXISTS door_question text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS covenant text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seats_total integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS next_meet text NOT NULL DEFAULT '';

CREATE POLICY "Group members see their own group roster" ON public.group_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members me WHERE me.group_id = group_members.group_id AND me.user_id = auth.uid()));

-- Praying counts without exposing who
CREATE OR REPLACE FUNCTION public.prayer_intercession_counts(_ids uuid[])
RETURNS TABLE (prayer_id uuid, n integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.prayer_id, count(*)::int
  FROM public.intercessions i
  WHERE i.prayer_id = ANY(_ids)
  GROUP BY i.prayer_id
$$;
REVOKE ALL ON FUNCTION public.prayer_intercession_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prayer_intercession_counts(uuid[]) TO authenticated;

-- Group member counts without exposing the roster
CREATE OR REPLACE FUNCTION public.group_member_counts(_ids uuid[])
RETURNS TABLE (group_id uuid, n integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gm.group_id, count(*)::int
  FROM public.group_members gm
  WHERE gm.group_id = ANY(_ids)
  GROUP BY gm.group_id
$$;
REVOKE ALL ON FUNCTION public.group_member_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.group_member_counts(uuid[]) TO authenticated;