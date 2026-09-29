DROP POLICY IF EXISTS "Leaders change their plan" ON public.org_subscriptions;
DROP POLICY IF EXISTS "Leaders start a plan" ON public.org_subscriptions;
DROP POLICY IF EXISTS "Owner starts their page fee" ON public.pro_subscriptions;
DROP POLICY IF EXISTS "Owner updates their page fee" ON public.pro_subscriptions;
REVOKE INSERT, UPDATE, DELETE ON public.org_subscriptions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.pro_subscriptions FROM authenticated, anon;

DROP POLICY IF EXISTS "Org counselors public" ON public.org_counselors;
CREATE POLICY "Org counselors visible for listed pages" ON public.org_counselors
FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.counselor_profiles cp WHERE cp.id = org_counselors.counselor_id AND (cp.status = 'approved' OR cp.user_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_counselors.org_id AND o.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Public reads service page media" ON storage.objects;
CREATE POLICY "Public reads service page media" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'profile-media' AND (
    owner_id = (auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.profile_media pm
      WHERE pm.storage_path = objects.name AND pm.moderation_status = 'visible' AND (
        (pm.page_type = 'organization' AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = pm.page_id))
        OR (pm.page_type = 'professional' AND EXISTS (SELECT 1 FROM public.pro_profiles pp WHERE pp.id = pm.page_id AND pp.status = 'approved'))
        OR (pm.page_type = 'counselor' AND EXISTS (SELECT 1 FROM public.counselor_profiles cp WHERE cp.id = pm.page_id AND cp.status = 'approved'))
      ))
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.logo_url = objects.name OR o.cover_path = objects.name)
    OR EXISTS (SELECT 1 FROM public.pro_profiles pp WHERE pp.photo_url = objects.name AND pp.status = 'approved')
    OR EXISTS (SELECT 1 FROM public.counselor_profiles cp WHERE cp.photo_url = objects.name AND cp.status = 'approved')
  )
);