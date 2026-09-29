ALTER TABLE public.organizations ADD COLUMN cover_path text;

CREATE TABLE public.profile_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type text NOT NULL CHECK (page_type IN ('organization', 'professional', 'counselor')),
  page_id uuid NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  storage_path text NOT NULL UNIQUE,
  caption text NOT NULL DEFAULT '' CHECK (char_length(caption) <= 180),
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0 AND display_order < 12),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moderation_status text NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_type, page_id, display_order)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_media TO authenticated;
GRANT SELECT ON public.profile_media TO anon;
GRANT ALL ON public.profile_media TO service_role;

ALTER TABLE public.profile_media ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_profile_page(_page_type text, _page_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _page_type
    WHEN 'organization' THEN EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = _page_id AND om.user_id = _user_id AND om.role IN ('owner', 'leader')
    )
    WHEN 'professional' THEN EXISTS (
      SELECT 1 FROM public.pro_profiles pp WHERE pp.id = _page_id AND pp.user_id = _user_id
    )
    WHEN 'counselor' THEN EXISTS (
      SELECT 1 FROM public.counselor_profiles cp WHERE cp.id = _page_id AND cp.user_id = _user_id
    )
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.profile_page_is_visible(_page_type text, _page_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _page_type
    WHEN 'organization' THEN EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = _page_id)
    WHEN 'professional' THEN EXISTS (SELECT 1 FROM public.pro_profiles pp WHERE pp.id = _page_id AND pp.status = 'approved')
    WHEN 'counselor' THEN EXISTS (SELECT 1 FROM public.counselor_profiles cp WHERE cp.id = _page_id AND cp.status = 'approved')
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.enforce_profile_media_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_profile_page(NEW.page_type, NEW.page_id, auth.uid()) THEN
    RAISE EXCEPTION 'You do not manage this page';
  END IF;
  IF (SELECT count(*) FROM public.profile_media pm WHERE pm.page_type = NEW.page_type AND pm.page_id = NEW.page_id) >= 12 THEN
    RAISE EXCEPTION 'This page already has 12 media items';
  END IF;
  NEW.owner_id := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profile_media_limit_before_insert
BEFORE INSERT ON public.profile_media
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_media_limit();

CREATE TRIGGER profile_media_updated_at
BEFORE UPDATE ON public.profile_media
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Visible page media is public"
ON public.profile_media FOR SELECT
TO anon, authenticated
USING (
  moderation_status = 'visible'
  AND (public.profile_page_is_visible(page_type, page_id) OR public.can_manage_profile_page(page_type, page_id, auth.uid()))
);

CREATE POLICY "Page managers add media"
ON public.profile_media FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND public.can_manage_profile_page(page_type, page_id, auth.uid())
);

CREATE POLICY "Page managers update media"
ON public.profile_media FOR UPDATE
TO authenticated
USING (public.can_manage_profile_page(page_type, page_id, auth.uid()))
WITH CHECK (public.can_manage_profile_page(page_type, page_id, auth.uid()));

CREATE POLICY "Page managers delete media"
ON public.profile_media FOR DELETE
TO authenticated
USING (public.can_manage_profile_page(page_type, page_id, auth.uid()));

CREATE INDEX profile_media_page_order_idx ON public.profile_media(page_type, page_id, display_order);

CREATE OR REPLACE FUNCTION public.set_organization_cover(_org_id uuid, _cover_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_profile_page('organization', _org_id, auth.uid()) THEN
    RAISE EXCEPTION 'You do not manage this page';
  END IF;
  UPDATE public.organizations SET cover_path = _cover_path WHERE id = _org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_profile_page(text, uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.profile_page_is_visible(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_organization_cover(uuid, text) TO authenticated, service_role;