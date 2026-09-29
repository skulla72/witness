CREATE TABLE public.beta_access (
  user_id uuid PRIMARY KEY,
  invited_by uuid,
  invitation_id uuid UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.beta_access TO authenticated;
GRANT ALL ON public.beta_access TO service_role;
ALTER TABLE public.beta_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their beta access" ON public.beta_access FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.beta_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  email text,
  invited_by uuid NOT NULL,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 50),
  use_count integer NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.beta_invitations TO authenticated;
GRANT ALL ON public.beta_invitations TO service_role;
ALTER TABLE public.beta_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inviters manage their invitations" ON public.beta_invitations FOR ALL TO authenticated USING (invited_by = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (invited_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_active_beta_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.beta_access WHERE user_id = _user_id AND status = 'active')
$$;

INSERT INTO public.beta_access (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE public.member_blocks (
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.member_blocks TO authenticated;
GRANT ALL ON public.member_blocks TO service_role;
ALTER TABLE public.member_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage their blocks" ON public.member_blocks FOR ALL TO authenticated USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());

CREATE TABLE public.prayer_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  parent_prayer_id uuid REFERENCES public.prayer_posts(id) ON DELETE CASCADE,
  post_type text NOT NULL DEFAULT 'ask' CHECK (post_type IN ('ask','answer')),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 2000),
  category text NOT NULL DEFAULT 'Faith' CHECK (category IN ('Health','Family','Provision','Faith','Relationships','Work','Salvation','Grief','Other')),
  privacy text NOT NULL DEFAULT 'circle' CHECK (privacy IN ('private','circle','church','public')),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','answered','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((post_type = 'ask' AND parent_prayer_id IS NULL) OR (post_type = 'answer' AND parent_prayer_id IS NOT NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_posts TO authenticated;
GRANT ALL ON public.prayer_posts TO service_role;
ALTER TABLE public.prayer_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read allowed prayers" ON public.prayer_posts FOR SELECT TO authenticated USING (
  public.is_active_beta_member(auth.uid())
  AND EXISTS (SELECT 1 FROM public.covenant_agreements c WHERE c.user_id = auth.uid() AND c.scope = 'app' AND c.scope_ref = 'app' AND c.version = '2026-09-2')
  AND status <> 'removed'
  AND NOT EXISTS (SELECT 1 FROM public.member_blocks b WHERE (b.blocker_id = auth.uid() AND b.blocked_id = author_id) OR (b.blocker_id = author_id AND b.blocked_id = auth.uid()))
  AND (
    author_id = auth.uid()
    OR privacy = 'public'
    OR (privacy = 'church' AND organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
    OR (privacy = 'circle' AND EXISTS (
      SELECT 1 FROM public.group_members gm_self
      JOIN public.group_members gm_author ON gm_author.group_id = gm_self.group_id
      WHERE gm_self.user_id = auth.uid() AND gm_author.user_id = author_id
    ))
  )
);
CREATE POLICY "Members create their prayers" ON public.prayer_posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND public.is_active_beta_member(auth.uid()));
CREATE POLICY "Authors update their prayers" ON public.prayer_posts FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors delete their prayers" ON public.prayer_posts FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE TABLE public.prayer_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id uuid NOT NULL REFERENCES public.prayer_posts(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  storage_path text NOT NULL UNIQUE,
  media_type text NOT NULL CHECK (media_type IN ('video','audio','image')),
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 157286400),
  duration_seconds integer CHECK (duration_seconds BETWEEN 1 AND 90),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.prayer_media TO authenticated;
GRANT ALL ON public.prayer_media TO service_role;
ALTER TABLE public.prayer_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read allowed prayer media" ON public.prayer_media FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.prayer_posts p WHERE p.id = prayer_id));
CREATE POLICY "Authors add prayer media" ON public.prayer_media FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.prayer_posts p WHERE p.id = prayer_id AND p.author_id = auth.uid()));
CREATE POLICY "Authors delete prayer media" ON public.prayer_media FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.intercessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id uuid NOT NULL REFERENCES public.prayer_posts(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 1000),
  media_path text,
  media_type text CHECK (media_type IN ('video','audio')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.intercessions TO authenticated;
GRANT ALL ON public.intercessions TO service_role;
ALTER TABLE public.intercessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prayer authors and senders read intercessions" ON public.intercessions FOR SELECT TO authenticated USING (sender_id = auth.uid() OR EXISTS (SELECT 1 FROM public.prayer_posts p WHERE p.id = prayer_id AND p.author_id = auth.uid()));
CREATE POLICY "Members send intercessions" ON public.intercessions FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_active_beta_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.prayer_posts p WHERE p.id = prayer_id));
CREATE POLICY "Senders delete intercessions" ON public.intercessions FOR DELETE TO authenticated USING (sender_id = auth.uid());

CREATE TABLE public.gratitude_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  privacy text NOT NULL DEFAULT 'private' CHECK (privacy IN ('private','community')),
  linked_prayer_id uuid REFERENCES public.prayer_posts(id) ON DELETE SET NULL,
  media_path text,
  media_type text CHECK (media_type IN ('video','audio','image')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gratitude_entries TO authenticated;
GRANT ALL ON public.gratitude_entries TO service_role;
ALTER TABLE public.gratitude_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read allowed gratitude" ON public.gratitude_entries FOR SELECT TO authenticated USING (author_id = auth.uid() OR (privacy = 'community' AND public.is_active_beta_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.covenant_agreements c WHERE c.user_id = auth.uid() AND c.scope = 'app' AND c.scope_ref = 'app' AND c.version = '2026-09-2')));
CREATE POLICY "Members create gratitude" ON public.gratitude_entries FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND public.is_active_beta_member(auth.uid()));
CREATE POLICY "Authors update gratitude" ON public.gratitude_entries FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors delete gratitude" ON public.gratitude_entries FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('prayer','message','profile','group','gratitude','organization')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('safety','harassment','privacy','spam','fraud','other')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  resolution_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members create reports" ON public.content_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND public.is_active_beta_member(auth.uid()));
CREATE POLICY "Members read their reports" ON public.content_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'vetter'));
CREATE POLICY "Moderators update reports" ON public.content_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'vetter')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'vetter'));

CREATE INDEX prayer_posts_author_created_idx ON public.prayer_posts (author_id, created_at DESC);
CREATE INDEX prayer_posts_parent_idx ON public.prayer_posts (parent_prayer_id);
CREATE INDEX prayer_media_prayer_idx ON public.prayer_media (prayer_id);
CREATE INDEX intercessions_prayer_idx ON public.intercessions (prayer_id, created_at);
CREATE INDEX gratitude_author_created_idx ON public.gratitude_entries (author_id, created_at DESC);
CREATE INDEX reports_status_created_idx ON public.content_reports (status, created_at);
CREATE INDEX invitations_inviter_idx ON public.beta_invitations (invited_by, created_at DESC);

CREATE TRIGGER update_beta_access_updated_at BEFORE UPDATE ON public.beta_access FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_prayer_posts_updated_at BEFORE UPDATE ON public.prayer_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gratitude_entries_updated_at BEFORE UPDATE ON public.gratitude_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_content_reports_updated_at BEFORE UPDATE ON public.content_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Members upload their testimony media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'testimony-media' AND (storage.foldername(name))[1] = auth.uid()::text AND public.is_active_beta_member(auth.uid()));
CREATE POLICY "Members read authorized testimony media" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'testimony-media' AND (
    owner_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.prayer_media pm JOIN public.prayer_posts p ON p.id = pm.prayer_id WHERE pm.storage_path = name)
    OR EXISTS (SELECT 1 FROM public.intercessions i JOIN public.prayer_posts p ON p.id = i.prayer_id WHERE i.media_path = name AND (i.sender_id = auth.uid() OR p.author_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.gratitude_entries g WHERE g.media_path = name AND (g.author_id = auth.uid() OR g.privacy = 'community'))
  )
);
CREATE POLICY "Members delete their testimony media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'testimony-media' AND owner_id = auth.uid()::text);