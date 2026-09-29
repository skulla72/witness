DROP POLICY "Visible page media is public" ON public.profile_media;
DROP POLICY "Page managers add media" ON public.profile_media;
DROP POLICY "Page managers update media" ON public.profile_media;
DROP POLICY "Page managers delete media" ON public.profile_media;

CREATE POLICY "Visible page media is public"
ON public.profile_media FOR SELECT
TO anon, authenticated
USING (
  moderation_status = 'visible' AND (
    (page_type = 'organization' AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = page_id))
    OR (page_type = 'professional' AND EXISTS (SELECT 1 FROM public.pro_profiles pp WHERE pp.id = page_id AND pp.status = 'approved'))
    OR (page_type = 'counselor' AND EXISTS (SELECT 1 FROM public.counselor_profiles cp WHERE cp.id = page_id AND cp.status = 'approved'))
    OR owner_id = auth.uid()
  )
);

CREATE POLICY "Page managers add media"
ON public.profile_media FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid() AND (
    (page_type = 'organization' AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = page_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'leader')
    ))
    OR (page_type = 'professional' AND EXISTS (
      SELECT 1 FROM public.pro_profiles pp WHERE pp.id = page_id AND pp.user_id = auth.uid()
    ))
    OR (page_type = 'counselor' AND EXISTS (
      SELECT 1 FROM public.counselor_profiles cp WHERE cp.id = page_id AND cp.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Page managers update media"
ON public.profile_media FOR UPDATE
TO authenticated
USING (
  (page_type = 'organization' AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = page_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'leader')
  ))
  OR (page_type = 'professional' AND EXISTS (
    SELECT 1 FROM public.pro_profiles pp WHERE pp.id = page_id AND pp.user_id = auth.uid()
  ))
  OR (page_type = 'counselor' AND EXISTS (
    SELECT 1 FROM public.counselor_profiles cp WHERE cp.id = page_id AND cp.user_id = auth.uid()
  ))
)
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Page managers delete media"
ON public.profile_media FOR DELETE
TO authenticated
USING (
  (page_type = 'organization' AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = page_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'leader')
  ))
  OR (page_type = 'professional' AND EXISTS (
    SELECT 1 FROM public.pro_profiles pp WHERE pp.id = page_id AND pp.user_id = auth.uid()
  ))
  OR (page_type = 'counselor' AND EXISTS (
    SELECT 1 FROM public.counselor_profiles cp WHERE cp.id = page_id AND cp.user_id = auth.uid()
  ))
);

CREATE OR REPLACE FUNCTION public.enforce_profile_media_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    (NEW.page_type = 'organization' AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = NEW.page_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'leader')
    ))
    OR (NEW.page_type = 'professional' AND EXISTS (
      SELECT 1 FROM public.pro_profiles pp WHERE pp.id = NEW.page_id AND pp.user_id = auth.uid()
    ))
    OR (NEW.page_type = 'counselor' AND EXISTS (
      SELECT 1 FROM public.counselor_profiles cp WHERE cp.id = NEW.page_id AND cp.user_id = auth.uid()
    ))
  ) THEN
    RAISE EXCEPTION 'You do not manage this page';
  END IF;
  IF (SELECT count(*) FROM public.profile_media pm WHERE pm.page_type = NEW.page_type AND pm.page_id = NEW.page_id) >= 12 THEN
    RAISE EXCEPTION 'This page already has 12 media items';
  END IF;
  NEW.owner_id := auth.uid();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_profile_media_limit() FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.set_organization_cover(uuid, text);
DROP FUNCTION public.profile_page_is_visible(text, uuid);
DROP FUNCTION public.can_manage_profile_page(text, uuid, uuid);